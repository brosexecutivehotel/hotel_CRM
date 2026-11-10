Dashboard UI design – the visual structure, cards, navigation, charts, typography, spacing and color system.



Motion design and interaction animation – how elements appear, move, change state, and transition between screens.



Data visualization – how charts, metrics, workflow diagrams and status indicators communicate information.


visual language combines:
- Minimalist SaaS dashboard design.
- Soft, muted surfaces with high-contrast accents.
- Dark navigation against a light workspace.
- Card-based information architecture.
- Node-based workflow visualization.
- Animated data visualization.
- Subtle, purposeful micro-interactions.

The layout has four major areas:
Area	Design pattern	Purpose
Left sidebar	Persistent vertical navigation	Application navigation
Top header	Workspace controls	Search, organization, notifications, settings
Main workspace	Dynamic content region	Dashboard, scenarios, runs
Contextual panel	Secondary information panel	Metrics, logs, execution details

Important design decision: The sidebar remains stationary while the main workspace changes.

This creates consistency and prevents users from losing their navigational context.


Sidebar design
The sidebar has:
- Near-black background.
- Lime-green active navigation item.
- Small monochrome icons.
- Compact typography.
- Rounded active selection.
- Notification counters.
- User profile at the bottom.
- Collapse navigation control.
The active navigation item uses a filled lime background, rather than simply changing the icon color.

This makes the current application location immediately recognizable.


The cards use:
- Light neutral backgrounds.
- Rounded corners.
- Very subtle shadows or borders.
- Small labels.
- Larger numerical values.
- Compact status indicators.
- Small inline charts.
A particularly effective pattern is that each card communicates information without requiring users to open it.


Recommended font choices for recreating it:
- Inter
- Geist Sans
- DM Sans
The typography hierarchy is approximately:
Element	Treatment
Page heading	Medium/semibold, prominent
KPI value	Large, bold
Card heading	Medium, compact
Supporting text	Small, muted
Navigation	Small/medium
Chart labels	Small, low contrast

The design uses typography hierarchy rather than excessive color to distinguish information.


Light and dark themes
At approximately 10 seconds, the interface transitions into dark mode.

Notice that the application does not simply invert every color.

Instead:
- The background becomes deep charcoal.
- Cards become dark green-grey.
- Text becomes light grey.
- The lime accent remains.
- Chart elements change to maintain contrast.
This is a proper semantic theme system.


Graphs and data visualization patterns
A. Stacked vertical bar chart
Design characteristics:
- Vertical columns.
- Two stacked data segments.
- Black and lime-green color combination.
- Light horizontal gridlines.
- Small axis labels.
- Hover tooltip.
- Selected-period filtering.
The two segments communicate different portions of an operation's total value.

The advantage of this design is that users can compare individual periods while also seeing their combined totals.

Recommended animation:
- Bars grow vertically from the baseline.
- Segments animate in sequence.
- Values update alongside the chart.
- Tooltip appears when a data point is hovered.
B. Sparkline charts
hese are the small line charts inside the automation cards.

They are called sparklines.

They communicate trends without needing a full chart with axes, legends and extensive labels.

Their design:
- Thin dark line.
- No prominent axis labels.
- Very subtle fill or background.
- Compact dimensions.
- Embedded inside information cards.
Recommended animation:
- Draw the line from left to right.
- Fade in the chart.
- Reveal the final data point.
- Update the chart when the underlying data changes.
C.Operational KPI and progress visualization
- Segmented progress meters.
- Horizontal progress bars.
- Success-rate indicators.
- Numeric KPI cards.
- Small performance charts.
These are useful for monitoring operational performance without requiring users to interpret complicated graphs.

UI/UX principles used in this application
Beyond the appearance and animations, there are several important UX principles worth reproducing.
Principle	How it is implemented
Persistent navigation	Sidebar remains visible
Visual hierarchy	Page headings, KPIs and card labels
Progressive disclosure	Detailed information appears when opening a scenario
Immediate feedback	Node animations and status changes
Contextual information	Right-side execution inspector
Recognition over recall	Icons, labels and status badges
Information density	Small charts embedded in cards
Visual consistency	Repeated card, button and badge patterns
User control	Filters, search, zoom, theme and execution controls
Operational visibility	Run history, execution timeline and logs

Particularly important: contextual inspector
When opening an automation scenario, the interface changes into a two-part layout:
- Left: workflow editor.
- Right: operational inspector.
The inspector displays metrics, success rate, recent executions and ownership information.

This is a very effective design pattern for ITSM, ERP, CRM and other enterprise applications.

It avoids sending users to separate pages just to inspect a selected object.
UX improvements to preserve when recreating it
I would add several engineering requirements:
- Keyboard navigation and visible focus states.
- Tooltips for icon-only controls.
- Text labels alongside status colors.
- Responsive layouts for smaller screens.
- Accessible contrast in both themes.
- Reduced-motion support.
- Loading, empty, success and error states.
- No animations that prevent users from accessing information.

Recommended frontend stack










React + TypeScript
Component architecture and application state
Core












GSAP
Timeline animation, node movement, SVG particles and micro-interactions
Core












React Flow (XYFlow)
Workflow nodes, edges, graph editing, zoom and pan
Recommended












Recharts
Bar charts, line charts, analytics and KPI visualizations
Recommended












Tailwind CSS
Design system, layout, responsive styling and themes
Recommended












Lucide React
Consistent outline icons

Requirement	Technology
Dashboard components	React
Type safety	TypeScript
Workflow graph	React Flow
Graph execution animation	GSAP
SVG particle animation	GSAP + SVG
Analytics charts	Recharts
Styling	Tailwind CSS
Icons	Lucide
Theme management	CSS variables + React context

One important architectural decision: use React Flow to manage graph structure and interaction, but use custom SVG edges and GSAP for the execution animations. This gives you much more control over the visual experience.


Here is a practical starting configuration:
Animation	Duration	Easing
Button interaction	120–180ms	ease-out
Tooltip	150–200ms	ease-out
Page transition	200–300ms	power2.out
Card entrance	350–450ms	power2.out
Node execution	550ms	Keyframes
SVG particle	500ms	power1.inOut
Error shake	250–400ms	power2.inOut
Theme transition	200–300ms	ease-in-out
