"""Tests for the simple test agent."""

import pytest
from bench.core.types import Action, Event, Observation, StepResult
from bench.core.api import EnvAdapter

from .test_simple_agent import SimpleTestAgent

class MockEnvAdapter(EnvAdapter):
    """A mock environment adapter for testing."""
    
    name = "mock-env"
    
    def reset(self) -> Observation:
        return Observation(payload={"test": "initial"})
        
    def execute(self, action: Action) -> StepResult:
        return StepResult(
            observation=Observation(payload={"test": "updated"}),
            events=[Event(name="test_event", payload={})],
            reward=1.0,
            done=False
        )

def test_simple_agent_workflow():
    """Test the complete agent workflow."""
    agent = SimpleTestAgent()
    env = MockEnvAdapter()
    
    # Test reset and initial observation
    obs = env.reset()
    assert obs.payload == {"test": "initial"}
    
    # Test planning
    plan = agent.plan(obs)
    assert "Processing observation from" in plan.rationale
    assert len(plan.steps) == 2
    assert plan.metadata["observation_data"] == {"test": "initial"}
    
    # Test acting
    action = agent.act(plan, obs)
    assert action.command == "test_action"
    assert "timestamp" in action.arguments
    assert len(action.tool_calls) == 0
    
    # Test full step
    result = agent.step(obs, env)
    assert result.observation.payload == {"test": "updated"}
    assert result.reward == 1.0
    assert not result.done