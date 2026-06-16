from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PiiFinding:
    kind: str
    count: int


EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
PHONE_TW_RE = re.compile(r"\b(?:09\d{2}[- ]?\d{3}[- ]?\d{3}|0\d{1,2}[- ]?\d{6,8})\b")
TAIWAN_ID_RE = re.compile(r"\b[A-Z][12]\d{8}\b", re.I)
CREDIT_CARD_RE = re.compile(r"\b(?:\d[ -]*?){13,19}\b")

SENSITIVE_STATE_KEYS = {
    "user:name",
    "user:email",
    "user:phone",
    "user:national_id",
    "user:address",
    "user:birthdate",
    "user:medical_history",
}

ALLOWED_PROFILE_KEYS = {
    "user:age",
    "user:budget",
    "user:main_goal",
    "user:marital_status",
    "user:has_children",
    "user:existing_coverage",
    "user:risk_preference",
    "user:last_recommended_product_name",
    "user:last_recommended_product_id",
}


def stable_hash(value: str, *, salt: str) -> str:
    raw = f"{salt}:{value}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def redact_text(text: str) -> tuple[str, list[PiiFinding]]:
    findings: list[PiiFinding] = []
    redacted = text

    patterns = [
        ("email", EMAIL_RE, "[REDACTED_EMAIL]"),
        ("phone", PHONE_TW_RE, "[REDACTED_PHONE]"),
        ("taiwan_id", TAIWAN_ID_RE, "[REDACTED_TW_ID]"),
        ("credit_card", CREDIT_CARD_RE, "[REDACTED_CARD]"),
    ]

    for kind, pattern, token in patterns:
        redacted, count = pattern.subn(token, redacted)
        if count:
            findings.append(PiiFinding(kind=kind, count=count))

    return redacted, findings


def redact_value(value: Any) -> tuple[Any, list[PiiFinding]]:
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, dict):
        output: dict[str, Any] = {}
        findings: list[PiiFinding] = []
        for key, item in value.items():
            if key in SENSITIVE_STATE_KEYS:
                output[key] = "[REDACTED_SENSITIVE_STATE]"
                findings.append(PiiFinding(kind=f"state_key:{key}", count=1))
                continue
            redacted_item, item_findings = redact_value(item)
            output[key] = redacted_item
            findings.extend(item_findings)
        return output, findings
    if isinstance(value, list):
        output_list = []
        findings: list[PiiFinding] = []
        for item in value:
            redacted_item, item_findings = redact_value(item)
            output_list.append(redacted_item)
            findings.extend(item_findings)
        return output_list, findings
    return value, []


def redact_jsonable(value: Any) -> tuple[str, list[PiiFinding]]:
    redacted, findings = redact_value(value)
    return json.dumps(redacted, ensure_ascii=False, sort_keys=True), findings


def filter_public_state(
    state: dict[str, Any],
) -> tuple[dict[str, str], list[PiiFinding]]:
    public: dict[str, str] = {}
    findings: list[PiiFinding] = []

    for key, value in state.items():
        if key.startswith("_"):
            continue

        if key in SENSITIVE_STATE_KEYS:
            findings.append(PiiFinding(kind=f"state_key:{key}", count=1))
            continue

        if key not in ALLOWED_PROFILE_KEYS:
            findings.append(PiiFinding(kind=f"unknown_state_key:{key}", count=1))
            continue

        redacted_value, value_findings = redact_value(value)
        public[key] = str(redacted_value)
        findings.extend(value_findings)

    return public, findings
