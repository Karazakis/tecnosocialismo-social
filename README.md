# Social · Tecnosocialismo

Prima versione funzionante del social network dell'ecosistema Tecnosocialismo.

## Funzioni

- account unico tramite `login.tecnosocialismo.com`;
- feed pubblico cronologico e feed “Segnale” spiegabile;
- post testuali, immagini e video della piattaforma comune;
- apprezzamenti, commenti, rilanci e contenuti salvati;
- rete personale con persone seguite;
- temi emergenti tramite hashtag e ricerca unificata;
- profilo filtrabile per autore;
- video incorporati tramite ID della piattaforma `video.tecnosocialismo.com`;
- bozze locali, condivisione nativa e collegamenti diretti ai post;
- dati applicativi e media nell’archivio Vercel Blob della suite.

## Avvio

```bash
pnpm install
pnpm dev
```

Le variabili richieste sono documentate in `.env.example`.

## Principi della fase alfa

Il feed “Recenti” resta integralmente cronologico. Il feed “Segnale” usa soltanto pesi leggibili — freschezza, conversazioni e rete scelta dall’utente — e può essere disattivato in ogni momento. Non sono previsti pubblicità o profilazione commerciale.
