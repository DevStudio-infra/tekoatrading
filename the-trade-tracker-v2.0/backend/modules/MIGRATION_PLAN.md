# Migration Plan: Capital API and Chart Services Refactoring

This document outlines the step-by-step plan for transitioning from the original monolithic services to the new modular structure for the Capital API and Chart services.

## Overview

We've refactored the original services into modular components that are:
- Better organized in dedicated directories
- More maintainable with single-responsibility modules
- Free from NestJS dependencies
- Easier to debug and extend

## New Module Structure

### Capital Module
```
/modules/capital/
  ├── interfaces/
  │   ├── capital-session.interface.ts
  │   ├── capital-market.interface.ts
  │   ├── capital-price.interface.ts
  │   └── capital-position.interface.ts
  ├── services/
  │   ├── capital-base.service.ts
  │   ├── capital-market.service.ts
  │   ├── capital-price.service.ts
  │   ├── capital-position.service.ts
  │   ├── capital-symbol.service.ts
  │   ├── capital-adapter.service.ts
  │   └── capital-main.service.ts
  └── index.ts
```

### Chart Module
```
/modules/chart/
  ├── interfaces/
  │   └── chart-options.interface.ts
  ├── services/
  │   ├── chart-base.service.ts
  │   ├── chart-data.service.ts
  │   ├── chart-generation.service.ts
  │   ├── chart-storage.service.ts
  │   ├── chart-adapter.service.ts
  │   └── chart-main.service.ts
  ├── utils/
  │   └── chart-utils.ts
  └── index.ts
```

### Chart Engine Module
```
/modules/chart-engine/
  ├── interfaces/
  │   └── chart-options.interface.ts
  ├── services/
  │   └── chart-engine.service.ts
  ├── utils/
  │   └── chart-utils.ts
  └── index.ts
```

## Migration Strategy

### Phase 1: Dual Operation (Current Phase)
1. **Keep existing services operational**: Don't modify or remove the original services yet.
2. **Use adapter services**: The `CapitalApiAdapterService` and `ChartAdapterService` provide identical interfaces to the original services but use the new modular architecture internally.
3. **Update environment variables**: Ensure all necessary environment variables are available to both the old and new services.

### Phase 2: Gradual Migration
1. **Identify dependent services**: Find all services that depend on the original `CapitalApiService` and `ChartService`.
2. **Migrate one dependent at a time**: For each dependent service:
   - Modify imports to use the new adapter services instead of the original services
   - Test thoroughly to ensure functionality is maintained
   - Fix any issues before moving to the next dependent

### Phase 3: Complete Transition
1. **Remove adapter services**: Once all dependents have been migrated to use the modular services directly, remove the adapter services.
2. **Remove original services**: Delete the original monolithic services as they're no longer needed.
3. **Update documentation**: Update all documentation to reflect the new architecture.

## Backward Compatibility

The adapter services ensure backward compatibility during the migration process. They expose the same methods and events as the original services while using the new modular implementation internally. This allows for a gradual migration without breaking existing functionality.

## Code Example: Migrating a Dependent Service

### Before Migration:
```typescript
import { capitalApiService } from '../services/capital-api.service';

// Using the original service
async function getMarketData(symbol: string) {
  const epic = await capitalApiService.searchMarkets(symbol);
  return capitalApiService.getMarketDetails(epic);
}
```

### After Migration (Phase 2, using adapter):
```typescript
import { capitalApiAdapter } from '../modules/capital/services/capital-adapter.service';

// Using the adapter service
async function getMarketData(symbol: string) {
  const epic = await capitalApiAdapter.searchMarkets(symbol);
  return capitalApiAdapter.getMarketDetails(epic);
}
```

### After Full Migration (Phase 3, using modular services):
```typescript
import { capitalMainService } from '../modules/capital';

// Using the new modular service directly
async function getMarketData(symbol: string) {
  const epic = await capitalMainService.searchMarkets(symbol);
  return capitalMainService.getMarketDetails(epic);
}
```

## Troubleshooting

If issues arise during migration:

1. **Compare input/output**: Ensure the new services produce identical output to the original services for the same input.
2. **Check event handling**: Verify that events are properly forwarded and handled in the new architecture.
3. **Examine error handling**: Ensure error handling is consistent between the old and new implementations.
4. **Verify WebSocket connectivity**: For real-time data, ensure WebSocket connections are properly established and maintained.

## Timeline

- **Phase 1 (Current)**: Setup of new modular architecture and adapter services
- **Phase 2**: Gradual migration of dependent services (estimate: 1-2 weeks)
- **Phase 3**: Removal of adapter services and original implementations (1 week after Phase 2 completion)
