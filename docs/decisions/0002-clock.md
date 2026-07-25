# ADR 0002: Reference-timestamp clock

Status: accepted.

Store remaining time at a monotonic reference timestamp and derive live time
from elapsed time. UI intervals repaint only. Clamp at zero and create one
explicit expiration transition.
