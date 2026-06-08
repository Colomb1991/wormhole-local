# Session Reports

Questa cartella contiene un **report dettagliato per ogni sessione di lavoro** su
Wormhole Local.

## Scopo

Né Claude Code (esecutore sul repo) né Claude Opus web (consulente di
pianificazione) hanno memoria persistente tra sessioni: ogni volta si riparte
**leggendo i file del repo**. Questi report sono pensati per essere letti da un
altro Claude (o da Stefano) che non sa nulla di come è andata la sessione.

Sono il complemento dettagliato di `docs/PROGRESS.md`:

| File | Cosa contiene | Granularità |
| ---- | ------------- | ----------- |
| `docs/PROGRESS.md` | Diario sintetico giorno per giorno | Sintetica |
| `docs/sessions/*.md` | Cronaca completa di una singola sessione | Dettagliata |

Il report di sessione **non sostituisce** PROGRESS.md: lo affianca.

## Convenzione di naming

```
YYYY-MM-DD-breve-slug.md
```

Esempi: `2026-06-08-setup-iniziale.md`, `2026-06-15-onboarding-cliente.md`.

Se in uno stesso giorno ci sono più sessioni distinte, aggiungere un suffisso:
`2026-06-08-setup-iniziale.md`, `2026-06-08b-fix-ci.md`.

## Cosa scrivere in ogni report

Ogni file deve contenere, come minimo:

- **Contesto**: chi/cosa, da dove si è partiti.
- **Cosa è stato fatto**: in ordine.
- **Comandi eseguiti e loro esito**: con output rilevante.
- **Decisioni prese**: con motivazione (e rimando alle ADR in `DECISIONS.md`).
- **Problemi incontrati e come risolti**.
- **Stato finale**: cosa funziona, cosa è verde.
- **Cosa resta da fare**: prossimi passi per la sessione successiva.

Scrivi pensando: *"lo leggerà un altro Claude che non sa nulla di questa
sessione"*. Vedi `DECISIONS.md` ADR-001 per il workflow ibrido.
