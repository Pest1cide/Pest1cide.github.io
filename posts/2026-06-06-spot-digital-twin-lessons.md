# What a Spot Digital Twin Taught Me About Integration

Our Aalto project set out to connect a physical Boston Dynamics Spot, human motion captured by OptiTrack, and a
simulated Spot in Genesis. The result was a real-to-simulation pipeline that could mirror robot state and respond
to live human input.

## A twin is a timing problem

The visual result is easy to understand: the simulated robot moves when the real system or operator moves. The
engineering work sits underneath that picture. State streams arrive at different rates, coordinate frames have
different conventions, and every interface makes assumptions about what the next component expects.

Small inconsistencies quickly become visible as drift, delay, unstable motion, or a robot that simply refuses to
behave as intended.

## Build around observability

The most useful development habit was making each stage inspectable. Before asking the full pipeline to work, we
needed to know whether:

- the Spot state was arriving correctly
- OptiTrack markers were interpreted in the intended frame
- mappings produced sensible commands
- the simulation reflected those commands without hidden state errors

That approach turns a difficult integration problem into a sequence of questions that can actually be answered.

## The broader lesson

A robotics system is not only its strongest algorithm. It is the agreement between every model, interface, clock,
and teammate involved. Project management and technical architecture become the same problem when the system has
to run in real time.
