import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useToast, useConfirm } from "./ToastProvider";
import { API_BASE } from "../utils/constants";

const API = `${API_BASE}/remises_fournisseurs_api.php`;

// Hauteur au-delà de laquelle une carte est repliée avec un bouton « Voir plus »
const HAUTEUR_REPLIEE = 320;
// Hauteur maximale d'une carte dépliée : au-delà, la carte défile à l'intérieur
const HAUTEUR_DEPLIEE = 520;

const fournisseurVide = () => ({
  nom: "",
  categorie: "",
  remises: [],
  promotions: [],
  contacts: [],
});

const styles = `
.remises-page {
  font-family: inherit;
  color: #1f2937;
  padding: 24px;
  background: #f8fafc;
  min-height: 100%;
}
.remises-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}
.remises-title {
  margin: 0;
  font-size: 26px;
  font-weight: 750;
  color: #111827;
}
.remises-subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}
.remises-search {
  position: relative;
  width: min(100%, 360px);
}
.remises-search input {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 42px 12px 14px;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  outline: none;
  background: white;
  font-size: 14px;
  transition: border-color .2s, box-shadow .2s;
}
.remises-search input:focus {
  border-color: #64748b;
  box-shadow: 0 0 0 3px rgba(100,116,139,.12);
}
.remises-search-icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}
.remises-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.remises-stat {
  background: white;
  border: 1px solid #e5eaf0;
  border-radius: 14px;
  padding: 16px 18px;
}
.remises-stat-value {
  font-size: 24px;
  font-weight: 750;
  color: #111827;
}
.remises-stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}
.remises-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  /* Chaque carte garde sa hauteur : dérouler une carte n'étire pas sa voisine */
  align-items: start;
}
.remise-card {
  background: white;
  border: 1px solid #e5eaf0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(15,23,42,.025);
  transition: box-shadow .2s, transform .2s;
}
.remise-card:hover {
  box-shadow: 0 8px 24px rgba(15,23,42,.07);
  transform: translateY(-2px);
}
.remise-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid #f1f5f9;
}
.remise-provider {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  color: #111827;
}
.remise-category {
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
}
.remise-count {
  flex-shrink: 0;
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 5px 8px;
  border-radius: 999px;
}
.remise-card-content {
  padding: 18px 20px;
}
.remise-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #64748b;
  font-weight: 750;
}
.remise-section-title.promo {
  margin-top: 20px;
}
.remise-line {
  border: 1px solid #edf1f5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.remise-line:last-child {
  margin-bottom: 0;
}
.remise-line-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.remise-rate {
  flex-shrink: 0;
  min-width: 64px;
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #d1fae5;
  border-radius: 8px;
  padding: 6px 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 800;
}
.remise-product {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.45;
}
.remise-condition {
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
  margin-top: 7px;
}
.remise-promo-line {
  border: 1px solid #f1e7d5;
  background: #fffcf5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.remise-promo-title {
  color: #92400e;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.45;
}
.remise-promo-product {
  color: #374151;
  font-size: 12px;
  margin-top: 5px;
  line-height: 1.45;
}
.remise-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.remise-date {
  display: inline-flex;
  background: #fef3c7;
  color: #92400e;
  padding: 4px 7px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
}
.remise-contact {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}
.remise-contact-title {
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-size: 10px;
  font-weight: 750;
  margin-bottom: 7px;
}
.remise-contact-name {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}
.remise-contact-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  font-size: 12px;
}
.remise-contact-item + .remise-contact-item {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e2e8f0;
}
.remise-contact-links a {
  color: #475569;
  text-decoration: none;
}
.remise-contact-links a:hover {
  color: #0f766e;
  text-decoration: underline;
}
.remise-empty {
  padding: 30px;
  text-align: center;
  color: #64748b;
  background: white;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
}
.remise-disclaimer {
  margin-top: 20px;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}
@media (max-width: 900px) {
  .remises-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .remises-page {
    padding: 14px;
  }
  .remises-stats {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .remises-title {
    font-size: 22px;
  }
  .remise-card-header,
  .remise-card-content {
    padding: 15px;
  }
  .remise-line-top {
    flex-direction: column;
  }
}

/* ── Voir plus ─────────────────────────────── */
.remise-collapse {
  position: relative;
  overflow: hidden;
  transition: max-height .35s ease;
}
/* Carte dépliée : son contenu défile à l'intérieur, sans faire défiler la page */
.remise-collapse.is-open {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}
.remise-collapse.is-open::-webkit-scrollbar {
  width: 6px;
}
.remise-collapse.is-open::-webkit-scrollbar-thumb {
  background: #fcd34d;
  border-radius: 999px;
}
.remise-collapse.is-collapsed::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64px;
  background: linear-gradient(to bottom, rgba(255,255,255,0), #fff);
  pointer-events: none;
}
.remise-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  border: 1px solid #fde68a;
  border-radius: 10px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}
.remise-more:hover {
  background: #fef3c7;
}
.remise-more-chevron {
  display: inline-block;
  transition: transform .25s ease;
}
.remise-more.is-open .remise-more-chevron {
  transform: rotate(180deg);
}

/* ── Boutons ───────────────────────────────── */
.remise-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.remise-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}
.remise-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.remise-btn:disabled {
  opacity: .5;
  cursor: default;
}
.remise-btn-primary {
  background: #FFB103;
  border-color: #FFB103;
  color: #1a1a1a;
}
.remise-btn-primary:hover {
  background: #d49400;
  border-color: #d49400;
}
.remise-btn-danger {
  color: #b91c1c;
  border-color: #fecaca;
}
.remise-btn-danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}
.remise-btn-icon {
  padding: 6px 9px;
}
.remises-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
.remise-updated {
  margin-top: 10px;
  color: #94a3b8;
  font-size: 11px;
}

/* ── Formulaire d'édition ──────────────────── */
.remise-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.remise-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.remise-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.remise-field label {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}
.remise-field input,
.remise-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  color: #1f2937;
  font: inherit;
  font-size: 13px;
  transition: border-color .2s, box-shadow .2s;
}
.remise-field textarea {
  min-height: 60px;
  resize: vertical;
}
.remise-field input:focus,
.remise-field textarea:focus {
  outline: none;
  border-color: #FFB103;
  box-shadow: 0 0 0 3px rgba(255, 177, 3, .18);
}
.remise-form-block {
  position: relative;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}
.remise-form-block .remise-form-grid {
  padding-right: 36px;
}
.remise-form-remove {
  position: absolute;
  top: 10px;
  right: 10px;
}
.remise-form-add {
  align-self: flex-start;
}
.remise-form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}
.remise-form-actions-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 640px) {
  .remise-form-grid {
    grid-template-columns: 1fr;
  }
}
`;

function RemiseLine({ remise }) {
  return (
    <div className="remise-line">
      <div className="remise-line-top">
        <div className="remise-rate">{remise.taux}</div>
        <div>
          <div className="remise-product">{remise.produit}</div>
          {remise.conditions && (
            <div className="remise-condition">{remise.conditions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PromotionLine({ promotion }) {
  return (
    <div className="remise-promo-line">
      <div className="remise-promo-title">{promotion.titre}</div>
      <div className="remise-promo-product">
        <strong>Produit concerné :</strong> {promotion.produit}
      </div>

      {promotion.dates?.length > 0 && (
        <div className="remise-dates">
          {promotion.dates.map((date, index) => (
            <span className="remise-date" key={`${date}-${index}`}>
              {date}
            </span>
          ))}
        </div>
      )}

      {promotion.conditions && (
        <div className="remise-condition">{promotion.conditions}</div>
      )}
    </div>
  );
}

// Replie le contenu trop long et ajoute un bouton « Voir plus » qui le déroule
function VoirPlus({ children }) {
  const contenuRef = useRef(null);
  const [hauteur, setHauteur] = useState(0);
  const [ouvert, setOuvert] = useState(false);

  useLayoutEffect(() => {
    const contenu = contenuRef.current;
    if (!contenu) return undefined;
    const observer = new ResizeObserver(() => setHauteur(contenu.scrollHeight));
    observer.observe(contenu);
    return () => observer.disconnect();
  }, []);

  // Petite marge : on ne replie pas une carte pour quelques pixels
  const tropLong = hauteur > HAUTEUR_REPLIEE + 60;
  const maxHeight = !tropLong
    ? "none"
    : `${ouvert ? Math.min(hauteur, HAUTEUR_DEPLIEE) : HAUTEUR_REPLIEE}px`;

  return (
    <>
      <div
        className={`remise-collapse${tropLong && !ouvert ? " is-collapsed" : ""}${ouvert ? " is-open" : ""}`}
        style={{ maxHeight }}
      >
        <div ref={contenuRef}>{children}</div>
      </div>
      {tropLong && (
        <button
          type="button"
          className={`remise-more${ouvert ? " is-open" : ""}`}
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
        >
          {ouvert ? "Voir moins" : "Voir plus"}
          <span className="remise-more-chevron">▾</span>
        </button>
      )}
    </>
  );
}

function FournisseurCard({ fournisseur, onEdit }) {
  const total = fournisseur.remises.length + fournisseur.promotions.length;

  return (
    <article className="remise-card">
      <div className="remise-card-header">
        <div>
          <h2 className="remise-provider">{fournisseur.nom}</h2>
          <div className="remise-category">{fournisseur.categorie}</div>
        </div>
        <div className="remise-header-actions">
          <span className="remise-count">
            {total} {total > 1 ? "offres" : "offre"}
          </span>
          <button type="button" className="remise-btn remise-btn-icon" onClick={onEdit} title="Modifier">
            ✎ Modifier
          </button>
        </div>
      </div>

      <div className="remise-card-content">
        <VoirPlus>
          {fournisseur.remises.length > 0 && (
            <>
              <h3 className="remise-section-title">
                <span>●</span> Remises négociées
              </h3>
              {fournisseur.remises.map((remise, index) => (
                <RemiseLine remise={remise} key={`remise-${index}`} />
              ))}
            </>
          )}

          {fournisseur.promotions.length > 0 && (
            <>
              <h3 className="remise-section-title promo">
                <span>◆</span> Promotions et offres
              </h3>
              {fournisseur.promotions.map((promotion, index) => (
                <PromotionLine promotion={promotion} key={`promo-${index}`} />
              ))}
            </>
          )}

          {total === 0 && (
            <div className="remise-empty">
              Les conditions de remise de ce fournisseur restent à compléter.
            </div>
          )}
        </VoirPlus>

        {fournisseur.contacts.length > 0 && (
          <div className="remise-contact">
            <div className="remise-contact-title">
              {fournisseur.contacts.length > 1 ? "Contacts privilégiés" : "Contact privilégié"}
            </div>

            {fournisseur.contacts.map((contact, index) => (
              <div className="remise-contact-item" key={`contact-${index}`}>
                {contact.nom && (
                  <div className="remise-contact-name">{contact.nom}</div>
                )}

                <div className="remise-contact-links">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`}>
                      ✉ {contact.email}
                    </a>
                  )}
                  {contact.telephone && (
                    <a href={`tel:${contact.telephone.replace(/\s/g, "")}`}>
                      ☎ {contact.telephone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {fournisseur.updated_by && (
          <div className="remise-updated">
            Modifié par {fournisseur.updated_by}
          </div>
        )}
      </div>
    </article>
  );
}

function Champ({ label, value, onChange, multiline = false, placeholder = "" }) {
  return (
    <div className="remise-field">
      <label>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

// Les dates d'une promotion s'éditent dans une zone de texte, une date par ligne
const versFormulaire = (f) => ({
  ...f,
  promotions: f.promotions.map((p) => ({ ...p, datesTexte: (p.dates || []).join("\n") })),
});

const depuisFormulaire = (f) => ({
  nom: f.nom,
  categorie: f.categorie,
  remises: f.remises,
  promotions: f.promotions.map(({ datesTexte, ...p }) => ({
    ...p,
    dates: datesTexte.split("\n").map((d) => d.trim()).filter(Boolean),
  })),
  contacts: f.contacts,
});

function FournisseurForm({ fournisseur, onCancel, onSaved, onDeleted }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(() => versFormulaire(fournisseur));
  const [saving, setSaving] = useState(false);

  const set = (champ) => (valeur) => setForm((f) => ({ ...f, [champ]: valeur }));
  const setLigne = (liste, index, champ) => (valeur) =>
    setForm((f) => ({
      ...f,
      [liste]: f[liste].map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)),
    }));
  const ajouterLigne = (liste, ligne) => setForm((f) => ({ ...f, [liste]: [...f[liste], ligne] }));
  const retirerLigne = (liste, index) =>
    setForm((f) => ({ ...f, [liste]: f[liste].filter((_, i) => i !== index) }));

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) {
      toast.error("Le nom du fournisseur est requis.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: fournisseur.id ?? null, fournisseur: depuisFormulaire(form) }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Enregistrement impossible.");
        return;
      }
      toast.success(`« ${data.fournisseur.nom} » enregistré`);
      onSaved(data.fournisseur);
    } catch {
      toast.error("Enregistrement impossible (erreur réseau).");
    } finally {
      setSaving(false);
    }
  };

  const supprimer = async () => {
    if (!await confirm(`Supprimer le fournisseur « ${fournisseur.nom} » et toutes ses offres ?`)) return;
    try {
      const res = await fetch(API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: fournisseur.id }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Suppression impossible.");
        return;
      }
      toast.success(`« ${fournisseur.nom} » supprimé`);
      onDeleted(fournisseur.id);
    } catch {
      toast.error("Suppression impossible (erreur réseau).");
    }
  };

  return (
    <article className="remise-card">
      <div className="remise-card-header">
        <h2 className="remise-provider">
          {fournisseur.id ? `Modifier ${fournisseur.nom}` : "Nouveau fournisseur"}
        </h2>
      </div>

      <form className="remise-card-content remise-form" onSubmit={enregistrer}>
        <div className="remise-form-grid">
          <Champ label="Nom du fournisseur *" value={form.nom} onChange={set("nom")} />
          <Champ label="Catégorie" value={form.categorie} onChange={set("categorie")} />
        </div>

        <h3 className="remise-section-title">
          <span>●</span> Remises négociées
        </h3>
        {form.remises.map((r, i) => (
          <div className="remise-form-block" key={`r-${i}`}>
            <div className="remise-form-grid">
              <Champ label="Taux" value={r.taux} onChange={setLigne("remises", i, "taux")} placeholder="ex : 35 %" />
              <Champ label="Produit" value={r.produit} onChange={setLigne("remises", i, "produit")} />
            </div>
            <Champ label="Conditions" value={r.conditions} onChange={setLigne("remises", i, "conditions")} multiline />
            <button type="button" className="remise-btn remise-btn-danger remise-btn-icon remise-form-remove"
              onClick={() => retirerLigne("remises", i)} title="Retirer cette remise">
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="remise-btn remise-form-add"
          onClick={() => ajouterLigne("remises", { taux: "", produit: "", conditions: "" })}>
          + Ajouter une remise
        </button>

        <h3 className="remise-section-title promo">
          <span>◆</span> Promotions et offres
        </h3>
        {form.promotions.map((p, i) => (
          <div className="remise-form-block" key={`p-${i}`}>
            <div className="remise-form-grid">
              <Champ label="Titre" value={p.titre} onChange={setLigne("promotions", i, "titre")} placeholder="ex : 10 % de remise" />
              <Champ label="Produit concerné" value={p.produit} onChange={setLigne("promotions", i, "produit")} />
            </div>
            <Champ label="Dates (une par ligne)" value={p.datesTexte} onChange={setLigne("promotions", i, "datesTexte")} multiline />
            <Champ label="Conditions" value={p.conditions} onChange={setLigne("promotions", i, "conditions")} multiline />
            <button type="button" className="remise-btn remise-btn-danger remise-btn-icon remise-form-remove"
              onClick={() => retirerLigne("promotions", i)} title="Retirer cette promotion">
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="remise-btn remise-form-add"
          onClick={() => ajouterLigne("promotions", { titre: "", produit: "", datesTexte: "", conditions: "" })}>
          + Ajouter une promotion
        </button>

        <h3 className="remise-section-title">Contacts privilégiés</h3>
        {form.contacts.map((c, i) => (
          <div className="remise-form-block" key={`c-${i}`}>
            <div className="remise-form-grid">
              <Champ label="Nom du contact" value={c.nom} onChange={setLigne("contacts", i, "nom")} />
              <Champ label="Téléphone" value={c.telephone} onChange={setLigne("contacts", i, "telephone")} />
              <Champ label="E-mail" value={c.email} onChange={setLigne("contacts", i, "email")} />
            </div>
            <button type="button" className="remise-btn remise-btn-danger remise-btn-icon remise-form-remove"
              onClick={() => retirerLigne("contacts", i)} title="Retirer ce contact">
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="remise-btn remise-form-add"
          onClick={() => ajouterLigne("contacts", { nom: "", email: "", telephone: "" })}>
          + Ajouter un contact
        </button>

        <div className="remise-form-actions">
          {fournisseur.id && (
            <button type="button" className="remise-btn remise-btn-danger" onClick={supprimer}>
              Supprimer le fournisseur
            </button>
          )}
          <div className="remise-form-actions-right">
            <button type="button" className="remise-btn" onClick={onCancel}>
              Annuler
            </button>
            <button type="submit" className="remise-btn remise-btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </form>
    </article>
  );
}

export default function RemisesFournisseurs() {
  const [fournisseurs, setFournisseurs] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [enEdition, setEnEdition] = useState(null); // id du fournisseur, ou "nouveau"

  useEffect(() => {
    fetch(API, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFournisseurs(data.fournisseurs);
        else setErreur(data.message || "Impossible de charger les remises.");
      })
      .catch(() => setErreur("Erreur réseau."));
  }, []);

  const liste = useMemo(() => fournisseurs || [], [fournisseurs]);

  const fournisseursFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) return liste;

    return liste.filter((fournisseur) => {
      const contenu = [
        fournisseur.nom,
        fournisseur.categorie,
        ...fournisseur.contacts.map(
          (contact) => `${contact.nom} ${contact.email} ${contact.telephone}`
        ),
        ...fournisseur.remises.map(
          (remise) =>
            `${remise.taux} ${remise.produit} ${remise.conditions}`
        ),
        ...fournisseur.promotions.map(
          (promotion) =>
            `${promotion.titre} ${promotion.produit} ${promotion.conditions} ${promotion.dates.join(" ")}`
        ),
      ]
        .join(" ")
        .toLowerCase();

      return contenu.includes(terme);
    });
  }, [recherche, liste]);

  const totalRemises = liste.reduce(
    (total, fournisseur) => total + fournisseur.remises.length,
    0
  );

  const totalPromotions = liste.reduce(
    (total, fournisseur) => total + fournisseur.promotions.length,
    0
  );

  const apresEnregistrement = (enregistre) => {
    setFournisseurs((prev) => {
      const autres = (prev || []).filter((f) => f.id !== enregistre.id);
      return [...autres, enregistre].sort((a, b) => a.nom.localeCompare(b.nom));
    });
    setEnEdition(null);
  };

  const apresSuppression = (id) => {
    setFournisseurs((prev) => (prev || []).filter((f) => f.id !== id));
    setEnEdition(null);
  };

  return (
    <div className="remises-page">
      <style>{styles}</style>

      <header className="remises-header">
        <div>
          <h1 className="remises-title">Remises fournisseurs</h1>
          <p className="remises-subtitle">
            Retrouvez les remises négociées, les produits concernés et les
            conditions des offres PROFERM 2026.
          </p>
        </div>

        <div className="remises-search">
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un fournisseur ou un produit…"
            aria-label="Rechercher un fournisseur ou un produit"
          />
          <span className="remises-search-icon">⌕</span>
        </div>
      </header>

      <section className="remises-stats" aria-label="Résumé des offres">
        <div className="remises-stat">
          <div className="remises-stat-value">{liste.length}</div>
          <div className="remises-stat-label">Fournisseurs référencés</div>
        </div>
        <div className="remises-stat">
          <div className="remises-stat-value">{totalRemises}</div>
          <div className="remises-stat-label">Remises négociées détaillées</div>
        </div>
        <div className="remises-stat">
          <div className="remises-stat-value">{totalPromotions}</div>
          <div className="remises-stat-label">Promotions et offres</div>
        </div>
      </section>

      <div className="remises-toolbar">
        <button
          type="button"
          className="remise-btn remise-btn-primary"
          onClick={() => setEnEdition("nouveau")}
          disabled={!fournisseurs}
        >
          + Ajouter un fournisseur
        </button>
      </div>

      {erreur && <div className="remise-empty">{erreur}</div>}
      {!erreur && !fournisseurs && <div className="remise-empty">Chargement…</div>}

      {enEdition === "nouveau" && (
        <section className="remises-grid">
          <FournisseurForm
            fournisseur={fournisseurVide()}
            onCancel={() => setEnEdition(null)}
            onSaved={apresEnregistrement}
            onDeleted={apresSuppression}
          />
        </section>
      )}

      {fournisseurs && (fournisseursFiltres.length > 0 ? (
        <section className="remises-grid">
          {fournisseursFiltres.map((fournisseur) =>
            enEdition === fournisseur.id ? (
              <FournisseurForm
                fournisseur={fournisseur}
                key={fournisseur.id}
                onCancel={() => setEnEdition(null)}
                onSaved={apresEnregistrement}
                onDeleted={apresSuppression}
              />
            ) : (
              <FournisseurCard
                fournisseur={fournisseur}
                key={fournisseur.id}
                onEdit={() => setEnEdition(fournisseur.id)}
              />
            )
          )}
        </section>
      ) : (
        <div className="remise-empty">
          Aucun fournisseur ou produit ne correspond à « {recherche} ».
        </div>
      ))}

      <p className="remise-disclaimer">
        Données issues du dépliant PROFERM « Les amis du réseau – Temps forts
        2026 », modifiables par l'équipe. Lorsque le dépliant renvoie vers un
        tarif ou un détail d’offre complémentaire, celui-ci est indiqué comme
        étant à consulter.
      </p>
    </div>
  );
}
