from __future__ import annotations

import warnings

from authlib.deprecate import AuthlibDeprecationWarning

from app import agent as agent
from app.agent import AgentFactory, create_agent, load_agent_prompt, root_agent

warnings.filterwarnings(
    "ignore",
    message=r"authlib\.jose module is deprecated, please use joserfc instead\.",
    category=AuthlibDeprecationWarning,
    module=r"authlib\._joserfc_helpers",
)

warnings.filterwarnings(
    "ignore",
    message=r"\[EXPERIMENTAL\] feature FeatureName\.PLUGGABLE_AUTH is enabled\.",
    category=UserWarning,
    module=r"google\.adk\.features\._feature_decorator",
)

__all__ = [
    "agent",
    "AgentFactory",
    "create_agent",
    "load_agent_prompt",
    "root_agent",
]
