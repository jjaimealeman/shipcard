# ShipCard Style Gallery

ShipCard supports 3 layouts, 3 styles, and 2 themes — 18 combinations total.

Customize at [shipcard.dev](https://shipcard.dev) or pass query params directly to any card URL.

---

## Layouts

### Classic

Stat rows stacked vertically. Height adjusts to content.

<img src="https://shipcard.dev/u/jjaimealeman?layout=classic" alt="Classic layout" width="495" />

```
?layout=classic
```

---

### Compact

Single-row layout with condensed stat display. Fixed height.

<img src="https://shipcard.dev/u/jjaimealeman?layout=compact" alt="Compact layout" width="495" />

```
?layout=compact
```

---

### Hero

Large featured stat at top, supporting stats below.

<img src="https://shipcard.dev/u/jjaimealeman?layout=hero" alt="Hero layout" width="495" />

```
?layout=hero
```

Control which stat is featured with `?hero-stat=`:

```
?layout=hero&hero-stat=sessions
?layout=hero&hero-stat=cost
?layout=hero&hero-stat=toolCalls
```

---

## Themes

### Dark (default)

<img src="https://shipcard.dev/u/jjaimealeman?theme=dark" alt="Dark theme" width="495" />

```
?theme=dark
```

---

### Light

<img src="https://shipcard.dev/u/jjaimealeman?theme=light" alt="Light theme" width="495" />

```
?theme=light
```

---

## Styles

### GitHub (default)

Neutral tones that blend with GitHub README backgrounds.

<img src="https://shipcard.dev/u/jjaimealeman?style=github" alt="GitHub style" width="495" />

```
?style=github
```

---

### Branded

Saturated colors with ShipCard accent palette.

<img src="https://shipcard.dev/u/jjaimealeman?style=branded" alt="Branded style" width="495" />

```
?style=branded
```

---

### Minimal

No borders, reduced chrome — clean and unobtrusive.

<img src="https://shipcard.dev/u/jjaimealeman?style=minimal" alt="Minimal style" width="495" />

```
?style=minimal
```

---

## Combinations

Mix layout, style, and theme freely:

```
?layout=hero&style=branded&theme=dark
?layout=compact&style=minimal&theme=light
?layout=classic&style=github&theme=light
```

---

## Hiding Stats

Use `?hide=` to remove individual stat rows:

```
?hide=cost
?hide=cost&hide=models
?hide=sessions&hide=projects
```

Hideable stats: `sessions`, `toolCalls`, `models`, `projects`, `cost`

---

## Full Example

```html
<img
  src="https://shipcard.dev/u/YOUR_USERNAME?layout=hero&style=branded&theme=dark&hero-stat=sessions"
  alt="ShipCard Stats"
  width="495"
/>
```

Visit [shipcard.dev](https://shipcard.dev) to configure interactively and copy the final URL.
