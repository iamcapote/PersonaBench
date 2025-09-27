"""Simple test agent for PersonaBench."""

from datetime import datetime
from bench.core.api import PersonaAgent
from bench.core.types import Action, Observation, Plan, Reaction

class SimpleTestAgent(PersonaAgent):
    """A basic test agent that implements the PersonaBench API."""
    
    name = "simple-test-agent"
    
    def plan(self, observation: Observation) -> Plan:
        """Simple planning that just echoes the observation."""
        return Plan(
            rationale=f"Processing observation from {observation.timestamp}",
            steps=["Observe current state", "Take test action"],
            metadata={"observation_data": observation.payload}
        )
        
    def act(self, plan: Plan, observation: Observation) -> Action:
        """Take a simple action based on the plan."""
        return Action(
            command="test_action",
            arguments={"timestamp": str(observation.timestamp)},
            tool_calls=[]
        )
        
    def react(self, observation: Observation, events: list[str]) -> Reaction:
        """Simple reaction to any events."""
        if events:
            return Reaction(
                adjustment=f"Noted events: {', '.join(events)}",
                metadata={"event_count": len(events)}
            )
        return Reaction(adjustment="noop")