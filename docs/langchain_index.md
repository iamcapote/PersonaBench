# LangChain Integration Documentation Index

_Last updated: 2025-10-02_

## Overview

PersonaBench uses LangChain as its orchestration framework to provide a flexible, scalable service layer around the plan→act→react evaluation harness. This documentation suite covers everything you need to understand, use, and extend the LangChain integration.

## Documentation Structure

### 🚀 Getting Started

Start here if you're new to PersonaBench or want to quickly run your first evaluation.

**[Quick Start Guide](./langchain_quickstart.md)** (15 minutes)
- Installation and setup
- Running your first evaluation
- Basic API usage
- Common tasks and debugging

### 📚 Core Documentation

Essential reading for understanding how PersonaBench integrates with LangChain.

**[LangChain Migration Guide](./langchain_migration_guide.md)** (comprehensive)
- Architecture overview with diagrams
- Core components explained
- Integration patterns
- Step-by-step migration checklist
- Testing strategies
- Troubleshooting guide

**[LangChain Examples](./langchain_examples.md)** (reference)
- Complete adapter implementations
- Route module examples
- Schema definitions
- State management patterns
- Background job processing
- WebSocket streaming

**[LangChain Service Architecture](./langchain_service.md)** (planning)
- High-level service design
- API contracts
- Deployment considerations
- Future roadmap

### 🤖 LLM Integration

Learn how to integrate large language models with PersonaBench agents.

**[LLM Agent Configuration](./llm_agent_configuration.md)** (guide)
- Supported LLM backends (OpenAI, Ollama, vLLM)
- Configuration reference
- Planner behavior
- Error handling
- Testing LLM agents

### 🏗️ System Architecture

Understand the broader system design and how components fit together.

**[Architecture Documentation](./architecture.md)** (overview)
- System surfaces and tech stack
- Integration gaps
- Backend and frontend plans
- Metrics roadmap

**[Evaluation Design](./evaluation_design.md)** (design)
- Metric families
- Human preference pipeline
- Scenario design
- API contracts

**[Operator Roles](./operator_roles.md)** (governance)
- Role definitions
- Access controls
- Workflow expectations

## Quick Navigation

### By Use Case

#### "I want to run my first evaluation"
→ Start with [Quick Start Guide](./langchain_quickstart.md)

#### "I need to add a new environment adapter"
1. Read adapter section in [Migration Guide](./langchain_migration_guide.md#pattern-3-dynamic-adapter-instantiation)
2. Study complete example in [Examples](./langchain_examples.md#complete-adapter-example)
3. Follow adapter creation in [Quick Start](./langchain_quickstart.md#adding-your-first-adapter)

#### "I want to create new API endpoints"
1. Review route patterns in [Migration Guide](./langchain_migration_guide.md#pattern-4-pydantic-schema-integration)
2. Study complete routes in [Examples](./langchain_examples.md#complete-route-module)
3. Check existing routes in `orchestration/routes/`

#### "I need to integrate an LLM backend"
1. Read [LLM Agent Configuration](./llm_agent_configuration.md)
2. Study LLM examples in [Examples](./langchain_examples.md#advanced-llm-integration)
3. Check backend addition pattern in [Migration Guide](./langchain_migration_guide.md#example-3-adding-llm-backend-support)

#### "I'm migrating an existing service to LangChain"
→ Follow the comprehensive [Migration Guide](./langchain_migration_guide.md) checklist

#### "I need to add background job processing"
→ See [Background Job Processing](./langchain_examples.md#background-job-processing) section

#### "I want to understand the system architecture"
→ Start with [Architecture Documentation](./architecture.md)

### By Component

#### Chains & Runnables
- [Migration Guide: Core Components](./langchain_migration_guide.md#1-langchain-runnable-chain)
- [Migration Guide: Integration Patterns](./langchain_migration_guide.md#pattern-1-wrapping-synchronous-code-with-runnablelambda)

#### Adapters
- [Migration Guide: Adapter Registry](./langchain_migration_guide.md#2-adapter-registry)
- [Examples: Complete Adapter](./langchain_examples.md#complete-adapter-example)
- [Quick Start: Adding Adapter](./langchain_quickstart.md#adding-your-first-adapter)

#### API Routes
- [Migration Guide: Route Organization](./langchain_migration_guide.md#5-route-organization)
- [Examples: Complete Route Module](./langchain_examples.md#complete-route-module)

#### Schemas (Pydantic)
- [Migration Guide: Pydantic Integration](./langchain_migration_guide.md#pattern-4-pydantic-schema-integration)
- [Examples: Complete Schema Module](./langchain_examples.md#complete-schema-module)

#### State Management
- [Migration Guide: State Pattern](./langchain_migration_guide.md#example-4-state-management-pattern)
- [Examples: Complete State Management](./langchain_examples.md#complete-state-management)

#### Authentication
- [Migration Guide: Auth Pattern](./langchain_migration_guide.md#pattern-5-authentication-dependency-injection)
- [Quick Start: Enable Auth](./langchain_quickstart.md#enable-admin-authentication)

#### LLM Integration
- [LLM Agent Configuration](./llm_agent_configuration.md)
- [Examples: LLM Backend](./langchain_examples.md#advanced-llm-integration)
- [Quick Start: Using LLMs](./langchain_quickstart.md#using-llm-agents)

#### Background Jobs
- [Examples: Celery Integration](./langchain_examples.md#background-job-processing)

### By Experience Level

#### Beginner
1. [Quick Start Guide](./langchain_quickstart.md) - Get hands-on quickly
2. [LLM Agent Configuration](./llm_agent_configuration.md) - Learn LLM basics
3. [Architecture Documentation](./architecture.md) - Understand the big picture

#### Intermediate
1. [Migration Guide](./langchain_migration_guide.md) - Deep dive into patterns
2. [Examples](./langchain_examples.md) - Study production code
3. [Evaluation Design](./evaluation_design.md) - Understand evaluation flow

#### Advanced
1. [Migration Guide: Testing](./langchain_migration_guide.md#testing--validation) - Advanced testing strategies
2. [Examples: Background Jobs](./langchain_examples.md#background-job-processing) - Async processing
3. [Service Architecture](./langchain_service.md) - Full system design

## Key Concepts

### LangChain Runnables

PersonaBench wraps its evaluation harness in LangChain `RunnableLambda` objects that provide:
- **Synchronous execution**: `chain.invoke(payload)`
- **Asynchronous execution**: `await chain.ainvoke(payload)`
- **Streaming execution**: `async for event in chain.astream(payload)`

See: [Migration Guide - Runnable Chain](./langchain_migration_guide.md#1-langchain-runnable-chain)

### Adapter Registry

Environment adapters (solitaire, blackjack, chess, etc.) are registered in a dictionary and instantiated dynamically based on scenario configuration.

See: [Migration Guide - Adapter Registry](./langchain_migration_guide.md#2-adapter-registry)

### Pydantic Schemas

All API request/response models use Pydantic for validation and automatic OpenAPI documentation generation.

See: [Migration Guide - Pydantic Integration](./langchain_migration_guide.md#pattern-4-pydantic-schema-integration)

### State Management

Evaluation results, queue entries, and other runtime state are stored in-memory using dataclass-based stores.

See: [Examples - State Management](./langchain_examples.md#complete-state-management)

### LLM Planners

Persona agents can delegate planning to LLM backends (OpenAI, Ollama, vLLM) configured per-evaluation.

See: [LLM Agent Configuration](./llm_agent_configuration.md)

## Code Repository Structure

```
PersonaBench/
├── orchestration/          # LangChain service layer
│   ├── app.py             # FastAPI application factory
│   ├── chains.py          # LangChain runnables
│   ├── catalog.py         # Data loaders (personas, scenarios)
│   ├── auth.py            # Authentication
│   ├── routes/            # API route handlers
│   │   ├── personas.py
│   │   ├── scenarios.py
│   │   ├── evaluations.py
│   │   └── ...
│   ├── schemas/           # Pydantic models
│   │   ├── personas.py
│   │   ├── scenarios.py
│   │   └── ...
│   └── state/             # In-memory state stores
│       ├── repository.py
│       ├── queue.py
│       └── ...
├── agents/                # Persona agent implementations
│   ├── base_agent.py      # Rule-based agent
│   ├── llm_agent.py       # LLM-backed agent
│   └── adapters/          # LLM backend adapters
│       ├── openai.py
│       ├── ollama.py
│       └── vllm.py
├── bench/                 # Core evaluation framework
│   ├── core/              # Base APIs and types
│   ├── adapters/          # Environment adapters
│   │   ├── solitaire/
│   │   ├── blackjack/
│   │   └── ...
│   └── eval/              # Metrics and scoring
├── harness/               # Rollout runner
│   ├── runner.py          # Main execution loop
│   └── match.py           # Multi-agent matches
├── personas/              # Persona definitions
│   ├── schema.json        # Persona schema
│   └── examples/          # Example personas
├── scenarios/             # Scenario definitions
│   ├── solitaire/
│   ├── blackjack/
│   └── ...
├── tests/                 # Test suite
│   ├── test_evaluation_chain.py
│   ├── test_llm_adapters.py
│   └── ...
└── docs/                  # Documentation
    ├── langchain_quickstart.md
    ├── langchain_migration_guide.md
    ├── langchain_examples.md
    └── ...
```

## Testing

All LangChain integration code is covered by tests:

```bash
# Run all tests
pytest tests/ -v

# Run LangChain-specific tests
pytest tests/test_evaluation_chain.py -v
pytest tests/test_llm_adapters.py -v
pytest tests/test_orchestration_crud.py -v
```

See: [Migration Guide - Testing](./langchain_migration_guide.md#testing--validation)

## API Reference

The orchestration service exposes the following endpoints:

### Public Endpoints
- `GET /api/personas` - List personas
- `GET /api/scenarios` - List scenarios
- `GET /api/games` - List games
- `POST /api/evaluations` - Run evaluation

### Admin Endpoints (require authentication)
- `POST /api/admin/personas` - Create persona
- `PUT /api/admin/personas/{name}` - Update persona
- `GET /api/admin/queue` - View evaluation queue
- `GET /api/admin/audit` - View audit trail

Full API documentation available at `/docs` when running the service.

## Common Workflows

### Running an Evaluation

```python
from orchestration.chains import build_evaluation_chain
from orchestration.catalog import get_persona, get_scenario

chain = build_evaluation_chain()
result = chain.invoke({
    "persona": get_persona("cooperative_planner"),
    "target": get_scenario("solitaire_basic"),
    "target_kind": "scenario",
    "config": {"max_steps": 10},
})
```

### Adding a New Adapter

1. Implement adapter class in `bench/adapters/yourenv/`
2. Register in `orchestration/chains.py:ADAPTER_REGISTRY`
3. Add tests in `tests/test_yourenv_adapter.py`
4. Create scenarios in `scenarios/yourenv/`

### Integrating an LLM

1. Add backend identifier to `LLM_BACKENDS` set
2. Implement `_build_llm_planner` case for your backend
3. Add tests with mock client
4. Document configuration in `llm_agent_configuration.md`

### Creating New Routes

1. Define Pydantic schemas in `orchestration/schemas/`
2. Implement route handlers in `orchestration/routes/yourroute.py`
3. Register router in `orchestration/routes/__init__.py`
4. Add tests in `tests/test_yourroute.py`

## Troubleshooting

Common issues and solutions are documented in:
- [Migration Guide - Troubleshooting](./langchain_migration_guide.md#troubleshooting)
- [Quick Start - Common Errors](./langchain_quickstart.md#common-errors)

## Contributing

When contributing LangChain-related features:

1. **Follow Existing Patterns**: Study the migration guide and examples
2. **Add Tests**: All new code must include unit and integration tests
3. **Document**: Update relevant documentation files
4. **Validate**: Ensure all tests pass before submitting

## Version History

- **2025-10-02**: Initial comprehensive LangChain documentation suite
- **2025-09-30**: LLM agent configuration guide
- **2025-09-29**: LangChain service architecture document

## Support

- **GitHub Issues**: https://github.com/iamcapote/PersonaBench/issues
- **Discussions**: https://github.com/iamcapote/PersonaBench/discussions
- **Documentation**: https://github.com/iamcapote/PersonaBench/tree/main/docs

---

**Ready to get started?** → [Quick Start Guide](./langchain_quickstart.md)

**Need comprehensive documentation?** → [Migration Guide](./langchain_migration_guide.md)

**Looking for code examples?** → [Examples](./langchain_examples.md)
