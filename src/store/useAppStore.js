// État global de l'application (Zustand) — persistance automatique dans le LocalStorage.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, EMPTY_INTEREST_MODEL } from '../data/defaults.js';
import { runScrape } from '../lib/scraper.js';
import { isRunDue, lastSlot } from '../lib/scheduler.js';
import { computeMatch, updateInterestModel } from '../lib/scoring.js';
import { addDays, deepMerge, fingerprint, setIn, uid, DAY } from '../lib/utils.js';
import { buildDemoData } from './demo.js';
import { syncAppEvents } from '../lib/appEvents.js';
import { fetchPublished, mergePublishedOffers } from '../lib/published.js';

export { findDossier } from '../lib/published.js';

export const STORAGE_KEY = 'stagepilot-v1';

const initialData = () => ({
  profile: structuredClone(DEFAULT_PROFILE),
  settings: structuredClone(DEFAULT_SETTINGS),
  offers: {},
  applications: {},
  contacts: {},
  events: {},
  notifications: [],
  interestModel: structuredClone(EMPTY_INTEREST_MODEL),
  followedCompanies: {},
  scrapeLog: [],
  dossiers: {}, // dossiers de candidature rédigés par la routine Claude (public/data/dossiers.json)
  published: { offersUpdatedAt: null, dossiersUpdatedAt: null, checkedAt: null, error: null },
  meta: { createdAt: new Date().toISOString(), initialized: false, hasDemo: false },
});

export const useAppStore = create(
  persist(
    (set, get) => ({
      ...initialData(),
      // --- état transitoire (non persisté) ---
      toasts: [],
      scraping: false,
      aiPanel: null, // { offerId, tab }

      // =====================================================================
      // Initialisation & horloge
      // =====================================================================
      bootstrap: () => {
        const s = get();
        if (!s.meta.initialized && s.settings.scraper.mode === 'real') {
          set({
            meta: { ...s.meta, initialized: true, hasDemo: false },
            settings: setIn(s.settings, 'scraper.lastRunAt', new Date().toISOString()),
            notifications: [{ id: uid('n'), type: 'info', title: 'Bienvenue sur StagePilot 👋', body: 'Les offres réelles sont collectées sur le web par la routine Claude (10 h et 15 h) et chargées automatiquement ici.', at: new Date().toISOString(), read: false, link: '/' }],
          });
        } else if (!s.meta.initialized) {
          const now = Date.now();
          const res = runScrape({ settings: s.settings, profile: s.profile, knownFingerprints: new Set(), now, initial: true });
          const offers = Object.fromEntries(res.added.map((o, i) => [o.id, { ...o, status: i < 6 ? 'new' : 'seen' }]));
          const demo = buildDemoData(Object.values(offers), s.profile, s.settings, now);
          set({
            offers,
            applications: demo.applications,
            contacts: demo.contacts,
            events: demo.events,
            settings: setIn(s.settings, 'scraper.lastRunAt', new Date(now).toISOString()),
            scrapeLog: [{ id: uid('run'), at: new Date(now).toISOString(), trigger: 'initial', added: res.added.length, duplicates: res.duplicates, filtered: res.filtered, scanned: res.scanned, bySource: res.bySource }],
            notifications: [{ id: uid('n'), type: 'info', title: 'Bienvenue sur StagePilot 👋', body: `${res.added.length} offres collectées pour démarrer. Les données de démonstration (candidatures, contacts) peuvent être supprimées dans Paramètres › Données.`, at: new Date(now).toISOString(), read: false, link: '/' }],
            meta: { ...s.meta, initialized: true, hasDemo: true },
          });
        } else if (isRunDue(s.settings.scraper)) {
          if (s.settings.scraper.catchUpOnOpen) get().scrapeNow('rattrapage');
          else set({ settings: setIn(s.settings, 'scraper.lastRunAt', lastSlot(s.settings.scraper.times).toISOString()) });
        }
        if (get().settings.scraper.mode !== 'simulated') get().syncPublished('ouverture');
        get().tick();
      },

      /** Appelé chaque minute : collectes planifiées, expirations, relances, rappels d'entretien. */
      tick: () => {
        const s = get();
        const now = Date.now();
        if (s.settings.scraper.enabled && isRunDue(s.settings.scraper) && !s.scraping) get().scrapeNow('planifiée');
        // Les routines publient sur GitHub Pages : on revérifie toutes les 10 minutes.
        const checked = s.published.checkedAt ? new Date(s.published.checkedAt).getTime() : 0;
        if (s.settings.scraper.mode !== 'simulated' && now - checked > 10 * 60_000) get().syncPublished('auto');

        const notifs = [];
        let { applications, offers, events } = get();
        // 1) Offres expirées → offre close
        for (const app of Object.values(applications)) {
          const offer = offers[app.offerId];
          if (offer && !offer.closedNotified && new Date(offer.expiresAt).getTime() < now && app.column === 'todo') {
            applications = { ...applications, [app.id]: { ...app, column: 'closed', history: [...(app.history ?? []), { at: new Date(now).toISOString(), column: 'closed', auto: true }] } };
            offers = { ...offers, [offer.id]: { ...offer, closedNotified: true } };
            notifs.push({ type: 'expired', title: 'Offre expirée', body: `« ${offer.title} » (${offer.company}) n'est plus en ligne : carte déplacée dans « Offre close ».`, link: '/pipeline' });
          }
        }
        // 2) Relances dues & entretiens imminents
        const hours = s.settings.notifications.interviewReminderHours;
        for (const ev of Object.values(events)) {
          if (ev.done || ev.notified) continue;
          const t = new Date(ev.date).getTime();
          if (ev.type === 'followup' && t <= now) {
            events = { ...events, [ev.id]: { ...ev, notified: true } };
            notifs.push({ type: 'followup', title: 'Relance à faire', body: ev.title.replace(/^Relancer( après entretien)? : /, ''), link: '/calendar' });
          }
          if (ev.type === 'interview' && t > now && t - now <= hours * 3600_000) {
            events = { ...events, [ev.id]: { ...ev, notified: true } };
            notifs.push({ type: 'interview', title: 'Entretien bientôt', body: `${ev.title.replace(/^Entretien : /, '')} — ${new Date(ev.date).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}`, link: '/calendar' });
          }
        }
        if (applications !== s.applications || offers !== s.offers || events !== s.events) set({ applications, offers, events });
        notifs.forEach((n) => get().notify(n));
      },

      // =====================================================================
      // Scraper
      // =====================================================================
      scrapeNow: (trigger = 'manuelle') => {
        const s = get();
        const { mode } = s.settings.scraper;
        if (mode !== 'simulated') {
          set({ settings: setIn(s.settings, 'scraper.lastRunAt', new Date().toISOString()) });
          get().syncPublished(trigger);
          if (mode === 'real') return null;
        }
        set({ scraping: true });
        const known = new Set(Object.values(s.offers).map((o) => o.fingerprint));
        const res = runScrape({ settings: s.settings, profile: s.profile, knownFingerprints: known });
        const at = new Date().toISOString();
        const added = Object.fromEntries(res.added.map((o) => [o.id, o]));
        set((st) => ({
          offers: { ...st.offers, ...added },
          settings: setIn(st.settings, 'scraper.lastRunAt', at),
          scrapeLog: [{ id: uid('run'), at, trigger, added: res.added.length, duplicates: res.duplicates, filtered: res.filtered, scanned: res.scanned, bySource: res.bySource, reasons: res.reasons }, ...st.scrapeLog].slice(0, 60),
          scraping: false,
        }));
        const { notifications: ns } = s.settings;
        const hot = res.added.map((o) => ({ o, m: computeMatch(o, s.profile, s.settings).score })).filter((x) => x.m >= ns.highMatchThreshold).sort((a, b) => b.m - a.m);
        hot.slice(0, 3).forEach(({ o, m }) => get().notify({ type: 'match', title: `Offre très pertinente · ${m} %`, body: `${o.title} — ${o.company} (${o.location.city})`, link: `/${o.space}?offer=${o.id}` }));
        if (hot.length > 3) get().notify({ type: 'match', title: `+${hot.length - 3} autres offres très pertinentes`, body: 'Consultez le Smart Feed.', link: '/france' });
        get().toast(res.added.length
          ? `Collecte ${trigger} : ${res.added.length} nouvelle(s) offre(s), ${res.duplicates} doublon(s) ignoré(s)`
          : `Collecte ${trigger} : aucune nouvelle offre (${res.duplicates} doublons ignorés)`, res.added.length ? 'success' : 'info');
        return res;
      },

      /**
       * Charge les offres réelles et les dossiers IA publiés par les routines Claude.
       * Ajoute uniquement les nouvelles offres (dédoublonnage par id puis par empreinte).
       */
      syncPublished: async (trigger = 'auto') => {
        const manual = !['auto', 'ouverture'].includes(trigger);
        if (manual) set({ scraping: true });
        const at = new Date().toISOString();
        try {
          const [offersFile, dossiersFile] = await Promise.all([
            fetchPublished('offers.json'),
            fetchPublished('dossiers.json').catch(() => null),
          ]);
          const s = get();
          const { offers, added, closed } = mergePublishedOffers(s.offers, offersFile.offers);
          const prevDossiers = s.dossiers ?? {};
          const dossiers = dossiersFile?.dossiers ?? prevDossiers;
          const newDossiers = Object.keys(dossiers).filter((id) => !prevDossiers[id]);
          const changed = added.length || closed.length || offersFile.updatedAt !== s.published.offersUpdatedAt;
          set((st) => ({
            offers: changed ? offers : st.offers,
            dossiers,
            published: { offersUpdatedAt: offersFile.updatedAt, dossiersUpdatedAt: dossiersFile?.updatedAt ?? st.published.dossiersUpdatedAt, checkedAt: at, error: null },
            scrapeLog: added.length || manual
              ? [{ id: uid('run'), at, trigger: `${trigger} · routine Claude`, added: added.length, duplicates: (offersFile.offers?.length ?? 0) - added.length, filtered: 0, scanned: offersFile.offers?.length ?? 0, bySource: added.reduce((acc, o) => ({ ...acc, [o.source]: (acc[o.source] ?? 0) + 1 }), {}), publishedAt: offersFile.updatedAt }, ...st.scrapeLog].slice(0, 60)
              : st.scrapeLog,
            scraping: false,
          }));
          const { notifications: ns } = s.settings;
          const hot = added.map((o) => ({ o, m: computeMatch(o, s.profile, s.settings).score })).filter((x) => x.m >= ns.highMatchThreshold).sort((a, b) => b.m - a.m);
          hot.slice(0, 3).forEach(({ o, m }) => get().notify({ type: 'match', title: `Offre très pertinente · ${m} %`, body: `${o.title} — ${o.company} (${o.location.city})`, link: `/${o.space}?offer=${o.id}` }));
          if (newDossiers.length && s.published.checkedAt) {
            get().notify({ type: 'info', title: `${newDossiers.length} dossier(s) IA prêt(s)`, body: 'CV personnalisé, lettre et préparation d’entretien rédigés par Claude.', link: '/pipeline' });
          }
          if (manual || added.length) {
            get().toast(added.length
              ? `${added.length} nouvelle(s) offre(s) réelle(s) chargée(s) — publication du ${new Date(offersFile.updatedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : `Aucune nouvelle offre depuis la dernière collecte de la routine (${new Date(offersFile.updatedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}).`, added.length ? 'success' : 'info');
          }
          return { added: added.length, closed: closed.length };
        } catch (e) {
          set((st) => ({ scraping: false, published: { ...st.published, checkedAt: at, error: e.message } }));
          if (manual) get().toast(`Impossible de charger les offres publiées (${e.message}).`, 'warning');
          return null;
        }
      },

      // =====================================================================
      // Offres
      // =====================================================================
      setOfferStatus: (id, status) => set((s) => ({ offers: { ...s.offers, [id]: { ...s.offers[id], status } } })),
      markSeen: (id) => { if (get().offers[id]?.status === 'new') get().setOfferStatus(id, 'seen'); },
      markAllSeen: (space) => set((s) => ({
        offers: Object.fromEntries(Object.entries(s.offers).map(([k, o]) => [k, o.status === 'new' && (!space || o.space === space) ? { ...o, status: 'seen' } : o])),
      })),

      /** Like (+1) / dislike (-1) : met à jour l'offre ET le modèle d'intérêt. Re-cliquer annule. */
      react: (id, reaction) => {
        const s = get();
        const offer = s.offers[id];
        const prev = offer.reaction ?? 0;
        const next = prev === reaction ? 0 : reaction;
        let model = s.interestModel;
        if (prev) model = updateInterestModel(model, offer, -prev, s.settings); // annule l'ancien signal
        if (next) model = updateInterestModel(model, offer, next, s.settings);
        set({ offers: { ...s.offers, [id]: { ...offer, reaction: next, status: offer.status === 'new' ? 'seen' : offer.status } }, interestModel: model });
      },

      archiveOffer: (id) => get().setOfferStatus(id, 'archived'),

      addManualOffer: (data) => {
        const s = get();
        const fp = fingerprint({ company: data.company, title: data.title, city: data.location.city });
        const dup = Object.values(s.offers).find((o) => o.fingerprint === fp);
        if (dup) {
          get().toast('Cette offre existe déjà (doublon détecté).', 'warning');
          return dup.id;
        }
        const id = uid('off');
        const now = new Date().toISOString();
        const offer = {
          id, fingerprint: fp, simulated: false, manual: true, status: 'seen', reaction: 0,
          postedAt: now, scrapedAt: now, expiresAt: data.expiresAt || addDays(now, 45),
          requirements: [], kind: 'core', companySizeRank: 0, source: 'manual', ...data,
        };
        set({ offers: { ...s.offers, [id]: offer } });
        get().toast('Offre ajoutée au Smart Feed.', 'success');
        return id;
      },

      toggleFollowCompany: (companyId) => set((s) => {
        const followedCompanies = { ...s.followedCompanies };
        if (followedCompanies[companyId]) delete followedCompanies[companyId];
        else followedCompanies[companyId] = new Date().toISOString();
        return { followedCompanies };
      }),

      // =====================================================================
      // Candidatures (Kanban)
      // =====================================================================
      createApplication: (offerId, column = 'todo') => {
        const s = get();
        const existing = Object.values(s.applications).find((a) => a.offerId === offerId);
        if (existing) return existing.id;
        const offer = s.offers[offerId];
        const id = uid('app');
        const now = new Date().toISOString();
        const app = {
          id, offerId, column, createdAt: now, updatedAt: now,
          url: offer?.url ?? '', appliedAt: column === 'sent' ? now : null,
          contactId: null, contactName: '', contactEmail: '', notes: '', interviewAt: null,
          history: [{ at: now, column }], documents: {},
        };
        set({
          applications: { ...s.applications, [id]: app },
          events: syncAppEvents(s.events, app, offer, s.settings),
          offers: offer ? { ...s.offers, [offerId]: { ...offer, status: offer.status === 'new' ? 'seen' : offer.status } } : s.offers,
        });
        get().toast('Ajoutée au pipeline « À postuler ».', 'success');
        return id;
      },

      moveApplication: (id, column) => {
        const s = get();
        const app = s.applications[id];
        if (!app || app.column === column) return;
        const now = new Date().toISOString();
        const patch = { column, updatedAt: now, history: [...(app.history ?? []), { at: now, column }] };
        if (column === 'sent' && !app.appliedAt) patch.appliedAt = now;
        if (['interview', 'rejected'].includes(column) && !app.respondedAt) patch.respondedAt = now;
        get().updateApplication(id, patch);
        if (column === 'sent') get().toast(`Relance programmée à J+${s.settings.notifications.followUpDays}.`, 'info');
        if (column === 'interview' && !app.interviewAt) get().toast("Pensez à saisir la date d'entretien pour l'ajouter à l'agenda.", 'info');
      },

      updateApplication: (id, patch) => {
        const s = get();
        const app = { ...s.applications[id], ...patch, updatedAt: new Date().toISOString() };
        set({ applications: { ...s.applications, [id]: app }, events: syncAppEvents(s.events, app, s.offers[app.offerId], s.settings) });
      },

      deleteApplication: (id) => set((s) => {
        const applications = { ...s.applications };
        delete applications[id];
        const events = Object.fromEntries(Object.entries(s.events).filter(([, e]) => e.applicationId !== id));
        return { applications, events };
      }),

      saveDocument: (offerId, kind, content) => {
        const s = get();
        let appId = Object.values(s.applications).find((a) => a.offerId === offerId)?.id;
        if (!appId) appId = get().createApplication(offerId);
        const app = get().applications[appId];
        get().updateApplication(appId, { documents: { ...app.documents, [kind]: { content, at: new Date().toISOString() } } });
        get().toast('Document enregistré sur la carte de candidature.', 'success');
      },

      // =====================================================================
      // Contacts (mini-CRM)
      // =====================================================================
      upsertContact: (contact) => {
        const id = contact.id ?? uid('ct');
        set((s) => ({ contacts: { ...s.contacts, [id]: { createdAt: new Date().toISOString(), interactions: [], ...s.contacts[id], ...contact, id } } }));
        return id;
      },
      deleteContact: (id) => set((s) => {
        const contacts = { ...s.contacts };
        delete contacts[id];
        return { contacts };
      }),
      logInteraction: (contactId, interaction) => set((s) => {
        const c = s.contacts[contactId];
        const at = interaction.at ?? new Date().toISOString();
        const interactions = [{ id: uid('it'), at, ...interaction }, ...(c.interactions ?? [])];
        return { contacts: { ...s.contacts, [contactId]: { ...c, interactions, lastContactAt: at, status: c.status === 'à contacter' ? 'contacté' : c.status } } };
      }),

      // =====================================================================
      // Agenda
      // =====================================================================
      upsertEvent: (ev) => {
        const id = ev.id ?? uid('ev');
        set((s) => ({ events: { ...s.events, [id]: { done: false, ...s.events[id], ...ev, id } } }));
        return id;
      },
      toggleEventDone: (id) => set((s) => ({ events: { ...s.events, [id]: { ...s.events[id], done: !s.events[id].done } } })),
      deleteEvent: (id) => set((s) => {
        const events = { ...s.events };
        delete events[id];
        return { events };
      }),

      // =====================================================================
      // Notifications & toasts
      // =====================================================================
      notify: (n) => {
        if (!get().settings.notifications.enabled) return;
        const notif = { id: uid('n'), at: new Date().toISOString(), read: false, ...n };
        set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 100) }));
        get().toast(`${n.title} — ${n.body}`, n.type === 'match' ? 'success' : n.type === 'expired' ? 'warning' : 'info');
      },
      markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifications: () => set({ notifications: [] }),

      toast: (message, variant = 'info') => {
        const id = uid('t');
        set((s) => ({ toasts: [...s.toasts, { id, message, variant }].slice(-4) }));
        setTimeout(() => get().dismissToast(id), 5000);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      openAiPanel: (offerId, tab = 'letter') => set({ aiPanel: { offerId, tab } }),
      closeAiPanel: () => set({ aiPanel: null }),

      // =====================================================================
      // Paramètres & données
      // =====================================================================
      updateSettings: (path, value) => set((s) => ({ settings: setIn(s.settings, path, value) })),
      updateProfile: (path, value) => set((s) => ({ profile: setIn(s.profile, path, value) })),
      resetInterestModel: () => {
        set({ interestModel: structuredClone(EMPTY_INTEREST_MODEL) });
        get().toast("Modèle d'intérêt réinitialisé.", 'info');
      },

      removeDemoData: () => set((s) => ({
        applications: Object.fromEntries(Object.entries(s.applications).filter(([, a]) => !a.demo)),
        contacts: Object.fromEntries(Object.entries(s.contacts).filter(([, c]) => !c.demo)),
        events: Object.fromEntries(Object.entries(s.events).filter(([, e]) => !e.demo && !Object.values(s.applications).some((a) => a.demo && a.id === e.applicationId))),
        meta: { ...s.meta, hasDemo: false },
      })),

      exportData: () => {
        const { toasts, scraping, aiPanel, ...rest } = get();
        const data = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function'));
        return JSON.stringify({ app: 'StagePilot', version: 1, exportedAt: new Date().toISOString(), data: { ...data, settings: setIn(data.settings, 'ai.apiKey', '') } }, null, 2);
      },
      importData: (json) => {
        const parsed = JSON.parse(json);
        if (parsed.app !== 'StagePilot' || !parsed.data) throw new Error('Fichier non reconnu.');
        const base = initialData();
        set({ ...base, ...parsed.data, settings: deepMerge(base.settings, parsed.data.settings ?? {}), profile: deepMerge(base.profile, parsed.data.profile ?? {}) });
      },
      resetAll: () => {
        set({ ...initialData(), toasts: [], aiPanel: null });
        get().bootstrap();
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ toasts, scraping, aiPanel, ...rest }) => rest,
      // Les nouveaux paramètres ajoutés dans une future version complètent l'état sauvegardé.
      merge: (persisted, current) => {
        const p = persisted ?? {};
        return { ...current, ...p, settings: deepMerge(current.settings, p.settings ?? {}), profile: deepMerge(current.profile, p.profile ?? {}), published: { ...current.published, ...p.published } };
      },
    },
  ),
);

export const daysUntilStart = (profile) => Math.ceil((new Date(profile.availability.start).getTime() - Date.now()) / DAY);
