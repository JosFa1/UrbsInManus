# Urbs in Manus - Roman Colony Strategy (Remake)

A short historical strategy game about founding and stabilizing a new Roman colony (late Republic / early Empire framing). You play as the local Roman magistrate (duovir) operating under a formal colony charter.

This repository currently contains the **foundation MVP**:
- Prologue dialogue scene framework
- Charter scope selection (small / medium / large)
- Arrival sequence (coastal vs inland)
- Petition/decision framework (approve / delay / deny)

Most content is intentionally placeholder/rough and is tracked in `progress.txt`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment

This project is configured for AWS Amplify deployment. The `amplify.yml` file handles the build process automatically.