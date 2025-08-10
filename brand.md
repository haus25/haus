# haus²⁵ brand guidelines

## philosophical foundation

haus²⁵ exists in opposition to digital sterility. it is a platform where live performance art meets blockchain technology, creating real-time assets that capture the intangible moment of creation. the brand embodies the tension between permanence and ephemerality, structure and chaos, establishment and underground.

### core principles

- **anti-establishment**: every design decision challenges conventional ui/ux patterns
- **bauhaus rebellion**: geometric forms disrupted by hand-drawn chaos
- **lowercase mandate**: capitalization is authority—we reject it completely
- **live-first**: static is death; everything must feel alive and in motion
- **underground authenticity**: digital graffiti on concrete walls

## color system

### primary palette - the bauhaus trinity

**#000000** - `bauhaus-black`  
pure void. absolute zero. the concrete wall where art begins.  
*usage*: primary backgrounds, heavy typography, borders, shadows

**#FFFFFF** - `bauhaus-white`  
stark light. pure existence. the chalk on blackboard.  
*usage*: text on dark backgrounds, card surfaces, contrast elements

**#FF0000** - `bauhaus-red`  
blood. raw energy. the disruption that breaks silence.  
*usage*: primary actions, calls-to-action, error states, accent highlights

### underground accents - digital rebellion

**#00FF00** - `bauhaus-electric`  
neon rebellion. electric consciousness. the glow of underground clubs.  
*usage*: interactive states, electric accent text, success indicators

**#0000FF** - `bauhaus-void`  
digital abyss. infinite depth. the space between pixels.  
*usage*: secondary actions, link states, decorative elements

### textural extensions - concrete reality

**#1A1A1A** - `bauhaus-concrete`  
underground walls. the surface that holds stories.  
*usage*: secondary backgrounds, cards, subtle surfaces

**#F8F8F8** - `bauhaus-chalk`  
graffiti medium. the tool of expression.  
*usage*: light backgrounds, input fields, subtle contrast

**#8B0000** - `bauhaus-rust`  
decay aesthetic. time's natural progression.  
*usage*: vintage effects, aged elements, temporal indicators

## typography system

### philosophy
text is rebellion. every letter lowercase defies establishment norms. typography must feel hand-carved, urgent, alive.

### primary typeface - work sans
**rationale**: geometric sans-serif rooted in bauhaus principles while maintaining digital clarity. its clean construction accepts distortion and transformation.

**weights used**:
- light (300): subtle text, captions
- medium (500): body text, descriptions  
- bold (700): emphasis, section headers
- black (900): titles, calls-to-action, disruption text

### usage patterns

```css
/* underground hierarchy */
h1: text-4xl md:text-6xl font-black tracking-tighter + text-shadow + skew(-2deg)
h2: text-2xl md:text-4xl font-black tracking-tight + text-shadow + skew(1deg)  
h3: text-xl md:text-2xl font-bold tracking-wide
body: text-base font-medium tracking-normal
caption: text-sm font-light tracking-wide
```

### text effects - hand-drawn disruption

**graffiti underlines**: hand-drawn red lines beneath key text  
**brutal shadows**: text-shadow creating depth and presence  
**skew transforms**: slight rotations breaking grid alignment  
**electric glow**: neon text-shadow effects for accent text

## layout philosophy

### asymmetric rebellion
traditional grids are authoritarian structures. haus²⁵ breaks them systematically.

**chaos grid**: `grid-template-columns: 1fr 2fr 1fr` with transform rotations  
**underground grid**: traditional grid with skew and rotation transforms  
**section chaos**: each section slightly rotated and offset

### spacing system
**rationale**: uneven, organic spacing that feels hand-placed rather than algorithmic.

```css
/* organic spacing - intentionally uneven */
xs: 0.25rem (4px)
sm: 0.75rem (12px)  
md: 1.5rem (24px)
lg: 2.25rem (36px)
xl: 3.5rem (56px)
2xl: 5rem (80px)
```

## component architecture

### buttons - underground mutations

**default (btn-underground)**:
- black-to-gray gradient background
- red border (2px solid)
- skewed transform (-2deg)
- red box-shadow offset
- hover: counter-skew, increased shadow

**electric variant**:
- electric green background (#00FF00)
- black text and border
- electric glow text-shadow
- flicker animation

**destructive variant**:
- red background with darker red border
- skew transforms on interaction
- brutal box-shadow

### cards - 3d hand-drawn containers

**structure**:
- hand-drawn border aesthetic (double-line effect)
- subtle rotation (-0.5deg to 0.5deg)
- depth shadows (multiple layers)
- hover: counter-rotation, increased elevation

**textures**:
- subtle noise overlay (concrete texture)
- scribble background patterns
- corner accent dots (red/green 2px circles)

### layout containers

**underground sections**:
- full-width containers with background textures
- asymmetric padding and margins
- parallax scroll effects
- random nonsense quotes positioned absolutely

**hand-drawn containers**:
- double-border effect with rotation
- scribble background patterns
- corner decorative elements

## animation language

### micro-interactions - objects with soul

**philosophy**: everything responds to human presence. hover states suggest life, not just interactivity.

**base transition**: `all 0.4s cubic-bezier(0.23, 1, 0.32, 1)`

**hover transformations**:
```css
transform: translateY(-3px) translateZ(6px) scale(1.02) rotate(0.5deg);
filter: brightness(1.1) saturate(1.2) contrast(1.05);
box-shadow: 0 8px 32px rgba(255, 0, 0, 0.15), 0 16px 64px rgba(0, 255, 0, 0.05);
```

### signature animations

**glitch disruption**:
```css
@keyframes glitch {
  0%, 99% { transform: none; }
  1% { transform: skew(0.5deg); }
  2% { transform: skew(-0.5deg); }
  3% { transform: none; }
}
```

**underground pulse**:
```css
@keyframes underground-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02) rotate(0.2deg); }
}
```

**electric flicker**:
```css
@keyframes electric-flicker {
  0%, 100% { text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00; }
  50% { text-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00; }
}
```

## 3d elements - bauhaus in space

### philosophy
three-dimensional elements add depth without complexity. geometric forms floating in digital space, suggesting movement and life.

### implementation
- **three.js integration**: interactive 3d components using react-three-fiber
- **floating geometry**: cubes and spheres with subtle distortion materials
- **parallax depth**: elements responding to scroll and mouse movement
- **minimal geometry**: simple forms maintaining bauhaus principles

### 3d components

**chaos geometry**: distorted cubes with red material, continuous rotation  
**disruption spheres**: wireframe spheres with electric green material  
**floating text**: 3d typography with subtle movement and rotation

## hand-drawn elements

### graffiti aesthetic
digital representations of analog mark-making. imperfection as authentication.

**scribble backgrounds**:
```css
background-image: url("data:image/svg+xml,...");
/* hand-drawn paths in red and green */
```

**graffiti underlines**: svg paths simulating marker strokes  
**corner scribbles**: decorative hand-drawn elements  
**nonsense quotes**: philosophical fragments positioned randomly

### nonsense quotes - underground wisdom
philosophical fragments that disrupt reading patterns and provide conceptual texture.

**examples**:
- "time dissolves when creativity explodes"  
- "the stage eats the performer who feeds the audience"
- "chaos is just order waiting to be discovered"
- "live performance is democracy in action"

**placement**: absolutely positioned, rotated, low opacity, appear on scroll

## accessibility compliance

### contrast ratios
- **primary text**: #000000 on #FFFFFF = 21:1 (AAA)
- **electric accent**: #00FF00 on #000000 = 15.3:1 (AAA)  
- **red accent**: #FF0000 on #FFFFFF = 3.99:1 (AA)
- **secondary text**: #1A1A1A on #F8F8F8 = 11.9:1 (AAA)

### interaction accessibility
- focus states: red outline with 2px offset
- keyboard navigation: all interactive elements accessible
- reduced motion: animations respect `prefers-reduced-motion`
- screen readers: proper aria labels and semantic html

## technical implementation

### css custom properties
```css
:root {
  --bauhaus-black: #000000;
  --bauhaus-white: #FFFFFF;  
  --bauhaus-red: #FF0000;
  --bauhaus-electric: #00FF00;
  --bauhaus-void: #0000FF;
  --bauhaus-concrete: #1A1A1A;
  --bauhaus-chalk: #F8F8F8;
  --bauhaus-rust: #8B0000;
}
```

### utility classes
```css
.brutal-text: font-black + text-shadow + skew
.graffiti-underline: hand-drawn underline effect
.electric-accent: green glow text effect
.handdrawn-box: double border with rotation
.btn-underground: complete underground button styling
.live-element: base 3d hover interactions
.section-chaos: section-level asymmetric transform
```

### animation performance
- `transform` and `opacity` only for smooth 60fps
- `will-change` property used sparingly
- `transform-style: preserve-3d` for 3d containers
- gpu acceleration via `transform-gpu` utility

## brand voice - visual language

### tone
urgent. immediate. uncompromising. the brand speaks through visual disruption rather than verbal explanation.

### personality traits
- **authentic**: imperfections are features, not bugs
- **disruptive**: challenges user expectations systematically  
- **inclusive**: welcomes all forms of creative expression
- **immediate**: prioritizes instant emotional response
- **underground**: maintains outsider aesthetic regardless of mainstream adoption

## implementation checklist

### required elements every page
- [ ] lowercase text throughout (no capitals ever)
- [ ] at least one asymmetric layout element  
- [ ] hand-drawn or scribble decorative element
- [ ] 3d or parallax interactive component
- [ ] electric accent color usage
- [ ] underground texture background
- [ ] nonsense quote positioned absolutely
- [ ] brutal typography with shadows/skew
- [ ] glitch or pulse animation element

### forbidden elements
- ❌ rounded corners (use angular geometric forms)
- ❌ corporate stock photography (hand-drawn only)
- ❌ centered, symmetric layouts (asymmetry required)
- ❌ uppercase text (lowercase mandate)
- ❌ smooth gradients (use harsh color transitions)
- ❌ traditional grid systems (break and skew)
- ❌ corporate language (authentic voice only)

## evolution and maintenance

the brand is alive. it evolves with the underground art community it serves. guidelines provide direction, not restrictions. when creative expression conflicts with brand consistency, expression wins.

**update frequency**: quarterly review of color accuracy, animation performance, accessibility compliance

**community input**: brand decisions informed by artist and performer feedback

**technical debt**: regular audit of css utility usage, component architecture, performance metrics

---

*this document captures the brand as of august 2025. haus²⁵ reserves the right to disrupt its own guidelines in service of authentic artistic expression.*
