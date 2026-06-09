# Why Distance Gradients Matter for Robot Motion

A scalar distance answers an important question: **how close is the robot to collision?**
For a controller, that is only the beginning. It also needs a direction that helps it move.

## From clearance to action

In obstacle-aware manipulation, the geometry lives in configuration space. A small change in a joint angle can
move several links in very different ways, so the most useful direction is not always obvious in Cartesian space.
A configuration-space distance function can provide both clearance and a gradient with respect to the robot state.

That gradient can shape a dynamical system, guide sampled controls, or become part of an observation for a learned
policy. The same representation can therefore connect geometric reasoning to several control strategies.

## The representation must earn trust

A smooth-looking field is not enough. I care about whether the gradients remain useful around difficult obstacles,
whether the controller still reaches its target, and whether the method behaves consistently across different
initial conditions.

My current work compares learned distance representations through:

- numerical distance and gradient checks
- dynamical-system obstacle-avoidance experiments
- MPPI benchmarks
- reinforcement-learning ablations for manipulation

The goal is not simply to learn a field. It is to learn one whose structure improves motion.

## The broader lesson

In robotics, a representation is valuable when it changes the decisions a system can make. Distance gradients are
one example of a useful bridge: they turn geometry into an actionable signal.
