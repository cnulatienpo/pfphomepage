Lookout
Lookout is a passive observation system for recording machine behavior under conditions.

It is not analytics. It does not track people. It does not store sessions, identities, or raw inputs.

What Lookout Observes
Lookout records only:

System behavior

state transitions
mode changes
fallbacks
resolutions
abandoned paths
Conditions

capability tiers
resource availability
network quality
asset presence
sensor presence (never content)
Humans may cause events, but are never the subject.

What Lookout Explicitly Does NOT Collect
The following are forbidden by design and by code:

user identifiers
session identifiers
IP addresses
device fingerprints
timestamps finer than coarse buckets
text, prompts, audio, images
cursor paths or keystrokes
location data
replayable sequences
continuous timelines
If these appear in an event payload, the event is dropped.

