# @ridefix/tsconfig

Shared TypeScript settings. Extend one of these from a workspace's `tsconfig.json`:

| File           | Use it for                                  |
| -------------- | ------------------------------------------- |
| `node.json`    | The six backend services (`services/*`)     |
| `library.json` | Shared code in `packages/*` and `contracts` |
| `react.json`   | Admin Web (`apps/admin-web`, Vite + React)  |

The mobile apps extend `expo/tsconfig.base` instead, because Expo ships the right settings for its SDK.

Example (inside `services/request-service/tsconfig.json`):

```json
{
  "extends": "@ridefix/tsconfig/node.json",
  "include": ["src"]
}
```

`${configDir}` (TypeScript 5.5+) means "the folder of the tsconfig that extends this one", so
`outDir` and `rootDir` work for every workspace without repeating them.
