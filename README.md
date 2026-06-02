# unslacked

Hackathon project. Monorepo — each service lives under `services/`.

## Layout

```
unslacked/
├── services/        # one folder per service (self-contained)
└── README.md
```

No workspace tooling wired up yet — each service manages its own deps until we
settle on stacks. Add a root `pnpm-workspace.yaml` / Turborepo later if it earns
its keep.

## Getting started

Clone, then work inside the relevant service:

```bash
git clone git@github.com:lukabudik/unslacked.git
cd unslacked/services/<service>
```

## Services

| Service | Stack | Description |
|---------|-------|-------------|
| _tbd_   | _tbd_ | _tbd_       |
