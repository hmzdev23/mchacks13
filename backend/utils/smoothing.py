"""
Temporal Smoothing Utilities

Smooth keypoint trajectories over time to reduce jitter.
"""

from __future__ import annotations

import numpy as np
from collections import deque
from typing import Optional


class EMAFilter:
    """Exponential Moving Average filter for smoothing."""

    def __init__(self, alpha: float = 0.3):
        self.alpha = alpha
        self.state: Optional[np.ndarray] = None

    def update(self, value: np.ndarray) -> np.ndarray:
        if self.state is None:
            self.state = value.copy()
        else:
            self.state = self.alpha * value + (1.0 - self.alpha) * self.state
        return self.state

    def reset(self):
        self.state = None


class MovingAverageFilter:
    """Simple moving average filter."""

    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self.buffer: deque[np.ndarray] = deque(maxlen=window_size)

    def update(self, value: np.ndarray) -> np.ndarray:
        self.buffer.append(value)
        stacked = np.stack(self.buffer, axis=0)
        return np.mean(stacked, axis=0)

    def reset(self):
        self.buffer.clear()


class LowPassFilter:
    """Basic low-pass filter used by the One Euro filter."""

    def __init__(self, alpha: float):
        self.alpha = alpha
        self.state: Optional[np.ndarray] = None

    def reset(self):
        self.state = None

    def update(self, value: np.ndarray, alpha_override: Optional[float] = None) -> np.ndarray:
        alpha = alpha_override if alpha_override is not None else self.alpha
        if self.state is None:
            self.state = value.copy()
        else:
            self.state = alpha * value + (1.0 - alpha) * self.state
        return self.state


class OneEuroFilter:
    """
    One Euro Filter - adaptive low-pass filter.

    Better than EMA because it adapts to speed:
    - Slow movements: more smoothing
    - Fast movements: less smoothing (preserves responsiveness)
    """

    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007, d_cutoff: float = 1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.x_filter = LowPassFilter(self._alpha(min_cutoff))
        self.dx_filter = LowPassFilter(self._alpha(d_cutoff))
        self.last_time: Optional[float] = None

    def _alpha(self, cutoff: float, dt: float = 1.0 / 30.0) -> float:
        """Compute alpha from cutoff frequency."""
        tau = 1.0 / (2.0 * np.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def reset(self):
        self.x_filter.reset()
        self.dx_filter.reset()
        self.last_time = None

    def update(self, value: np.ndarray, timestamp: float) -> np.ndarray:
        """
        Update filter with new value.

        Args:
            value: Current value (array)
            timestamp: Current timestamp in seconds
        """
        if self.last_time is None:
            self.last_time = timestamp
            self.x_filter.state = value.copy()
            self.dx_filter.state = np.zeros_like(value)
            return value

        dt = max(1e-4, timestamp - self.last_time)
        self.last_time = timestamp

        # Estimate derivative
        prev_x = self.x_filter.state if self.x_filter.state is not None else value
        dx = (value - prev_x) / dt
        alpha_d = self._alpha(self.d_cutoff, dt)
        dx_hat = self.dx_filter.update(dx, alpha_d)

        # Adjust cutoff based on speed
        cutoff = self.min_cutoff + self.beta * np.abs(dx_hat)
        alpha = self._alpha(cutoff, dt)

        return self.x_filter.update(value, alpha)
