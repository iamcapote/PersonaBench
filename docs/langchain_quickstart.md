# LangChain Quick Start Guide

_Last updated: 2025-10-02_

## Purpose

This guide helps you get started with PersonaBench's LangChain integration in under 15 minutes. For comprehensive documentation, see the [LangChain Migration Guide](./langchain_migration_guide.md) and [LangChain Examples](./langchain_examples.md).

## Prerequisites

- Python 3.9 or higher
- Basic understanding of async Python
- Familiarity with REST APIs

## Installation

```bash
# Clone the repository
git clone https://github.com/iamcapote/PersonaBench.git
cd PersonaBench

# Install with dependencies
pip install -e .

# Install dev dependencies for testing
pip install -e ".[dev]"
```

## Running Tests

Verify your installation:

```bash
pytest tests/ -v
```

All 44 tests should pass.

## Starting the Service

### Development Server

```bash
# Start the orchestration service
uvicorn orchestration.server:app --reload --port 8000
```

The service will be available at `http://localhost:8000`.

### API Documentation

Open your browser to:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Your First Evaluation

### 1. List Available Personas

```bash
curl http://localhost:8000/api/personas
```

Response:
```json
[
  {
    "name": "cooperative_planner",
    "version": "1.0",
    "description": "Persona focused on collaborative problem-solving",
    "risk_tolerance": 0.3,
    "planning_horizon": 5,
    ...
  }
]
```

### 2. List Available Scenarios

```bash
curl http://localhost:8000/api/scenarios
```

Response:
```json
[
  {
    "id": "solitaire_basic",
    "title": "Basic Solitaire",
    "environment": "solitaire",
    ...
  }
]
```

### 3. Run an Evaluation

```bash
curl -X POST http://localhost:8000/api/evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "persona": "cooperative_planner",
    "scenario": "solitaire_basic",
    "config": {
      "max_steps": 10,
      "seed": 42
    }
  }'
```

Response:
```json
{
  "status": "completed",
  "details": {
    "run_id": "123e4567-e89b-12d3-a456-426614174000",
    "persona": "cooperative_planner",
    "adapter": "solitaire",
    "summary": {
      "total_steps": 10,
      "total_reward": 5.0,
      "valid_actions": 9,
      "invalid_actions": 1
    },
    "steps": [...],
    "trace": [...]
  }
}
```

## Python Client Example

```python
"""Simple Python client for PersonaBench."""

import requests

BASE_URL = "http://localhost:8000/api"

def run_evaluation(persona_id: str, scenario_id: str, max_steps: int = 10):
    """Run an evaluation and return results."""
    response = requests.post(
        f"{BASE_URL}/evaluations",
        json={
            "persona": persona_id,
            "scenario": scenario_id,
            "config": {"max_steps": max_steps},
        },
    )
    response.raise_for_status()
    return response.json()

# Run an evaluation
result = run_evaluation("cooperative_planner", "solitaire_basic")
print(f"Status: {result['status']}")
print(f"Total reward: {result['details']['summary']['total_reward']}")
```

## Using with LangChain Directly

```python
"""Direct LangChain integration example."""

from orchestration.chains import build_evaluation_chain
from orchestration.catalog import get_persona, get_scenario

# Build the evaluation chain
chain = build_evaluation_chain()

# Prepare payload
payload = {
    "persona": get_persona("cooperative_planner"),
    "target": get_scenario("solitaire_basic"),
    "target_kind": "scenario",
    "target_id": "solitaire_basic",
    "config": {"max_steps": 10},
}

# Synchronous execution
result = chain.invoke(payload)
print(f"Status: {result['status']}")
print(f"Steps: {len(result['steps'])}")

# Asynchronous execution
import asyncio

async def run_async():
    result = await chain.ainvoke(payload)
    return result

result = asyncio.run(run_async())
print(f"Async result: {result['status']}")

# Streaming execution
async def stream_events():
    async for event in chain.astream(payload):
        if event["type"] == "trace":
            print(f"Trace: {event['payload']['event']}")
        elif event["type"] == "result":
            print(f"Final result: {event['payload']['status']}")

asyncio.run(stream_events())
```

## Adding Your First Adapter

### 1. Create Adapter File

```python
# bench/adapters/tictactoe/adapter.py
"""Simple tic-tac-toe adapter."""

from typing import Any, Dict, Tuple
from bench.core.api import EnvAdapter
from bench.core.types import Observation

class TicTacToeAdapter(EnvAdapter):
    """Adapter for tic-tac-toe scenarios."""
    
    name = "tictactoe"
    
    def __init__(self, seed: int = 42):
        self.seed = seed
        self._board = None
    
    def reset(self) -> Observation:
        """Start a new game."""
        self._board = [[" " for _ in range(3)] for _ in range(3)]
        return Observation(
            text="Tic-tac-toe game started. Board is empty.",
            data={"board": self._board, "turn": "X"},
        )
    
    def step(self, action: str) -> Tuple[Observation, float, bool, Dict[str, Any]]:
        """Execute a move (e.g., "0,0" for top-left)."""
        try:
            row, col = map(int, action.split(","))
            if not (0 <= row < 3 and 0 <= col < 3):
                raise ValueError("Invalid position")
            
            if self._board[row][col] != " ":
                return (
                    Observation(text="Position already taken!"),
                    -0.5,
                    False,
                    {"valid": False},
                )
            
            self._board[row][col] = "X"
            done = self._check_winner() is not None
            reward = 1.0 if done else 0.0
            
            return (
                Observation(text=self._render_board(), data={"board": self._board}),
                reward,
                done,
                {"valid": True},
            )
        
        except (ValueError, IndexError):
            return (
                Observation(text="Invalid move format. Use: row,col"),
                -0.5,
                False,
                {"valid": False},
            )
    
    def _render_board(self) -> str:
        """Render board as text."""
        lines = ["Current board:"]
        for row in self._board:
            lines.append(" | ".join(row))
            lines.append("-" * 9)
        return "\n".join(lines[:-1])
    
    def _check_winner(self) -> str | None:
        """Check if game is won."""
        # Check rows, columns, diagonals
        for i in range(3):
            if self._board[i][0] == self._board[i][1] == self._board[i][2] != " ":
                return self._board[i][0]
            if self._board[0][i] == self._board[1][i] == self._board[2][i] != " ":
                return self._board[0][i]
        
        if self._board[0][0] == self._board[1][1] == self._board[2][2] != " ":
            return self._board[0][0]
        if self._board[0][2] == self._board[1][1] == self._board[2][0] != " ":
            return self._board[0][2]
        
        return None
```

### 2. Register Adapter

```python
# orchestration/chains.py
from bench.adapters.tictactoe.adapter import TicTacToeAdapter

ADAPTER_REGISTRY: Dict[str, Type[EnvAdapter]] = {
    "solitaire": SolitaireAdapter,
    "blackjack": BlackjackAdapter,
    "tictactoe": TicTacToeAdapter,  # Add your adapter
}
```

### 3. Create Test

```python
# tests/test_tictactoe_adapter.py
"""Tests for tic-tac-toe adapter."""

import pytest
from bench.adapters.tictactoe.adapter import TicTacToeAdapter

def test_tictactoe_accepts_valid_move():
    """Verify valid moves are accepted."""
    adapter = TicTacToeAdapter()
    adapter.reset()
    
    obs, reward, done, info = adapter.step("0,0")
    
    assert info["valid"]
    assert not done
    assert "X" in obs.text

def test_tictactoe_rejects_invalid_move():
    """Verify invalid moves are rejected."""
    adapter = TicTacToeAdapter()
    adapter.reset()
    
    obs, reward, done, info = adapter.step("invalid")
    
    assert not info["valid"]
    assert reward < 0
```

### 4. Create Scenario

```yaml
# scenarios/tictactoe/basic.yaml
id: tictactoe_basic
metadata:
  title: Basic Tic-Tac-Toe
  description: Simple tic-tac-toe game
  difficulty: easy
environment: tictactoe
config:
  seed: 42
```

### 5. Test End-to-End

```bash
# Run tests
pytest tests/test_tictactoe_adapter.py -v

# Test via API
curl -X POST http://localhost:8000/api/evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "persona": "cooperative_planner",
    "scenario": "tictactoe_basic",
    "config": {"max_steps": 5}
  }'
```

## Using LLM Agents

### OpenAI Example

```python
"""Run evaluation with OpenAI-backed agent."""

from openai import OpenAI
from orchestration.chains import build_evaluation_chain
from orchestration.catalog import get_persona, get_scenario

# Create OpenAI client
client = OpenAI(api_key="your-api-key")

# Build payload with LLM config
payload = {
    "persona": get_persona("cooperative_planner"),
    "target": get_scenario("solitaire_basic"),
    "target_kind": "scenario",
    "target_id": "solitaire_basic",
    "config": {
        "max_steps": 5,
        "agent": {
            "type": "llm",
            "backend": "openai_chat",
            "client": client,
            "model": "gpt-4o-mini",
            "system_prompt": "You are a strategic game player.",
            "default_command": "noop",
        },
    },
}

# Run evaluation
chain = build_evaluation_chain()
result = chain.invoke(payload)

print(f"LLM-backed evaluation: {result['status']}")
```

### Ollama Example (Local LLM)

```python
"""Run evaluation with local Ollama model."""

from orchestration.chains import build_evaluation_chain
from orchestration.catalog import get_persona, get_scenario

payload = {
    "persona": get_persona("cooperative_planner"),
    "target": get_scenario("solitaire_basic"),
    "target_kind": "scenario",
    "target_id": "solitaire_basic",
    "config": {
        "max_steps": 5,
        "agent": {
            "type": "llm",
            "backend": "ollama",
            "model": "llama2",
            "host": "http://localhost:11434",
            "default_command": "noop",
        },
    },
}

chain = build_evaluation_chain()
result = chain.invoke(payload)
print(f"Ollama result: {result['status']}")
```

## Common Tasks

### Enable Admin Authentication

```bash
# Set admin key environment variable
export PERSONABENCH_ADMIN_KEY="your-secret-key"

# Start service
uvicorn orchestration.server:app --reload
```

```bash
# Use admin key in requests
curl -X POST http://localhost:8000/api/admin/personas \
  -H "x-admin-key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "new_persona",
    "version": "1.0",
    "planning_horizon": 3,
    "risk_tolerance": 0.5,
    "deception_aversion": 0.7
  }'
```

### View Evaluation Results

```python
"""Retrieve and analyze evaluation results."""

from orchestration.state import list_evaluation_responses

# Get all evaluations for a persona
responses = list_evaluation_responses(persona_id="cooperative_planner")

for response in responses:
    print(f"Run: {response.run_id}")
    print(f"Status: {response.status}")
    print(f"Reward: {response.summary.get('total_reward', 0)}")
    print(f"Steps: {response.summary.get('total_steps', 0)}")
    print()
```

### Compare Two Evaluations

```python
"""Compare performance across evaluations."""

from orchestration.state import get_evaluation_response

def compare_runs(run_a_id: str, run_b_id: str):
    """Compare two evaluation runs."""
    run_a = get_evaluation_response(run_a_id)
    run_b = get_evaluation_response(run_b_id)
    
    if not run_a or not run_b:
        print("One or both runs not found")
        return
    
    print(f"Run A ({run_a.persona_id}):")
    print(f"  Reward: {run_a.summary.get('total_reward', 0)}")
    print(f"  Steps: {run_a.summary.get('total_steps', 0)}")
    print(f"  Valid actions: {run_a.summary.get('valid_actions', 0)}")
    
    print(f"\nRun B ({run_b.persona_id}):")
    print(f"  Reward: {run_b.summary.get('total_reward', 0)}")
    print(f"  Steps: {run_b.summary.get('total_steps', 0)}")
    print(f"  Valid actions: {run_b.summary.get('valid_actions', 0)}")
    
    reward_diff = run_a.summary.get('total_reward', 0) - run_b.summary.get('total_reward', 0)
    print(f"\nReward difference: {reward_diff:+.2f}")

compare_runs("run-id-1", "run-id-2")
```

## Debugging Tips

### Enable Verbose Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Inspect Chain Execution

```python
def debug_evaluation(persona_id: str, scenario_id: str):
    """Run evaluation with detailed debugging."""
    from orchestration.chains import build_evaluation_chain
    from orchestration.catalog import get_persona, get_scenario
    import json
    
    persona = get_persona(persona_id)
    scenario = get_scenario(scenario_id)
    
    print("=" * 80)
    print(f"Persona: {json.dumps(persona, indent=2)}")
    print("=" * 80)
    print(f"Scenario: {json.dumps(scenario, indent=2)}")
    print("=" * 80)
    
    chain = build_evaluation_chain()
    payload = {
        "persona": persona,
        "target": scenario,
        "target_kind": "scenario",
        "target_id": scenario_id,
        "config": {"max_steps": 3},
    }
    
    result = chain.invoke(payload)
    
    print("=" * 80)
    print(f"Result: {json.dumps(result, indent=2, default=str)}")
    print("=" * 80)

debug_evaluation("cooperative_planner", "solitaire_basic")
```

### Check Trace Events

```python
async def trace_evaluation(persona_id: str, scenario_id: str):
    """Stream and display trace events."""
    from orchestration.chains import build_evaluation_chain
    from orchestration.catalog import get_persona, get_scenario
    
    chain = build_evaluation_chain()
    payload = {
        "persona": get_persona(persona_id),
        "target": get_scenario(scenario_id),
        "target_kind": "scenario",
        "target_id": scenario_id,
        "config": {"max_steps": 5},
    }
    
    async for event in chain.astream(payload):
        if event["type"] == "trace":
            trace = event["payload"]
            print(f"[{trace['event']}] {trace.get('message', '')}")
        elif event["type"] == "result":
            print(f"Final: {event['payload']['status']}")

import asyncio
asyncio.run(trace_evaluation("cooperative_planner", "solitaire_basic"))
```

## Next Steps

1. **Explore the Full Migration Guide**: [langchain_migration_guide.md](./langchain_migration_guide.md)
2. **Study Code Examples**: [langchain_examples.md](./langchain_examples.md)
3. **Review Architecture**: [architecture.md](./architecture.md)
4. **Understand LLM Integration**: [llm_agent_configuration.md](./llm_agent_configuration.md)
5. **Check Evaluation Design**: [evaluation_design.md](./evaluation_design.md)

## Getting Help

- **Issues**: https://github.com/iamcapote/PersonaBench/issues
- **Discussions**: https://github.com/iamcapote/PersonaBench/discussions
- **Documentation**: https://github.com/iamcapote/PersonaBench/tree/main/docs

## Common Errors

### `ModuleNotFoundError: No module named 'langchain'`

**Solution**: Install dependencies
```bash
pip install -e .
```

### `ValueError: No adapter registered for 'xyz'`

**Solution**: Check adapter registration in `orchestration/chains.py`

### `HTTPException: 403 Forbidden`

**Solution**: Provide admin key when accessing protected endpoints
```bash
curl -H "x-admin-key: your-secret" http://localhost:8000/api/admin/...
```

### `TimeoutError` during evaluation

**Solution**: Increase timeout or reduce max_steps
```python
config = {
    "max_steps": 5,  # Reduce steps
    "agent": {
        "request_timeout": 60,  # Increase timeout
    }
}
```
