<script setup lang="ts">
import type { PersonaKey } from '../domain/types'

defineProps<{
  persona: PersonaKey
}>()
</script>

<template>
  <svg
    class="persona-glyph"
    :data-persona="persona"
    viewBox="0 0 320 320"
    role="img"
    :aria-label="`${persona} persona illustration`"
  >
    <rect class="glyph-bg" x="0" y="0" width="320" height="320" rx="36" />
    <circle class="glyph-orbit" cx="160" cy="160" r="118" />
    <path class="glyph-grid" d="M42 108H278M42 212H278M108 42V278M212 42V278" />

    <g v-if="persona === 'peacekeeper'" class="glyph-character">
      <circle class="ink" cx="160" cy="154" r="68" />
      <circle class="ink" cx="105" cy="104" r="24" />
      <circle class="ink" cx="215" cy="104" r="24" />
      <ellipse class="paper" cx="160" cy="170" rx="34" ry="24" />
      <circle class="accent" cx="148" cy="150" r="7" />
      <circle class="accent" cx="172" cy="150" r="7" />
      <path class="stroke" d="M133 180H187M126 167L88 158M194 167L232 158" />
      <circle class="accent-soft" cx="75" cy="228" r="32" />
      <circle class="accent-soft" cx="245" cy="228" r="32" />
      <path class="stroke" d="M92 228H125M195 228H228" />
    </g>

    <g v-else-if="persona === 'contrarian'" class="glyph-character">
      <path class="ink" d="M93 111L119 54L146 100Q160 88 174 100L201 54L227 111V197Q227 242 160 256Q93 242 93 197Z" />
      <path class="paper" d="M125 161Q160 136 195 161Q190 205 160 218Q130 205 125 161Z" />
      <circle class="accent" cx="136" cy="140" r="7" />
      <circle class="accent" cx="184" cy="140" r="7" />
      <path class="stroke" d="M148 184H172" />
      <path class="accent-stroke" d="M52 222H112M52 222L76 198M52 222L76 246M208 98H268M268 98L244 74M268 98L244 122" />
    </g>

    <g v-else-if="persona === 'picky'" class="glyph-character">
      <path class="ink" d="M101 119L118 64L154 104Q160 102 166 104L202 64L219 119V207Q219 249 160 258Q101 249 101 207Z" />
      <ellipse class="paper" cx="160" cy="176" rx="34" ry="28" />
      <circle class="accent" cx="137" cy="145" r="7" />
      <circle class="accent" cx="183" cy="145" r="7" />
      <path class="stroke" d="M151 184L160 190L169 184M124 177L83 168M196 177L237 168" />
      <circle class="accent-soft" cx="240" cy="228" r="30" />
      <path class="accent-stroke" d="M225 213L255 243M255 213L225 243" />
    </g>

    <g v-else-if="persona === 'adventurer'" class="glyph-character">
      <path class="ink" d="M90 115L120 54L151 101L160 98L169 101L200 54L230 115L214 219Q207 255 160 265Q113 255 106 219Z" />
      <path class="paper" d="M129 165Q160 145 191 165L176 212H144Z" />
      <circle class="accent" cx="136" cy="139" r="7" />
      <circle class="accent" cx="184" cy="139" r="7" />
      <path class="accent-stroke" d="M222 72H270V120M270 72L214 128" />
      <circle class="accent-soft" cx="72" cy="235" r="24" />
    </g>

    <g v-else-if="persona === 'valueHunter'" class="glyph-character">
      <circle class="ink" cx="151" cy="155" r="66" />
      <circle class="ink" cx="101" cy="103" r="26" />
      <circle class="ink" cx="201" cy="103" r="26" />
      <path class="ink" d="M202 151Q276 160 254 253Q215 226 196 191Z" />
      <ellipse class="paper" cx="151" cy="178" rx="32" ry="26" />
      <circle class="accent" cx="130" cy="150" r="7" />
      <circle class="accent" cx="172" cy="150" r="7" />
      <path class="accent-stroke" d="M70 235H116M93 213V257M198 235H250M224 213V257M116 235H198" />
    </g>

    <g v-else-if="persona === 'homebody'" class="glyph-character">
      <ellipse class="ink" cx="146" cy="187" rx="82" ry="62" />
      <circle class="paper" cx="213" cy="177" r="35" />
      <circle class="accent" cx="223" cy="169" r="6" />
      <path class="stroke" d="M86 183Q146 111 206 183Q146 253 86 183ZM111 183H181M146 132V234" />
      <circle class="accent-soft" cx="66" cy="245" r="20" />
      <path class="accent-stroke" d="M235 80H276M276 80L258 62M276 80L258 98" />
    </g>

    <g v-else-if="persona === 'foodFanatic'" class="glyph-character">
      <circle class="ink" cx="160" cy="158" r="76" />
      <circle class="ink" cx="102" cy="96" r="30" />
      <circle class="ink" cx="218" cy="96" r="30" />
      <ellipse class="paper" cx="160" cy="180" rx="38" ry="30" />
      <circle class="accent" cx="134" cy="148" r="8" />
      <circle class="accent" cx="186" cy="148" r="8" />
      <path class="stroke" d="M146 190Q160 200 174 190" />
      <path class="accent-stroke" d="M62 244H258M82 226V262M126 226V262M170 226V262M214 226V262" />
      <circle class="accent-soft" cx="256" cy="74" r="24" />
    </g>

    <g v-else class="glyph-character">
      <circle class="ink" cx="160" cy="157" r="72" />
      <ellipse class="ink" cx="93" cy="151" rx="30" ry="54" transform="rotate(-18 93 151)" />
      <ellipse class="ink" cx="227" cy="151" rx="30" ry="54" transform="rotate(18 227 151)" />
      <ellipse class="paper" cx="160" cy="181" rx="36" ry="29" />
      <circle class="accent" cx="136" cy="149" r="7" />
      <circle class="accent" cx="184" cy="149" r="7" />
      <path class="stroke" d="M148 190Q160 202 172 190" />
      <circle class="accent-soft" cx="72" cy="246" r="24" />
      <circle class="accent-soft" cx="160" cy="258" r="24" />
      <circle class="accent-soft" cx="248" cy="246" r="24" />
    </g>

    <circle class="glyph-dot" cx="278" cy="42" r="8" />
  </svg>
</template>

<style scoped>
.persona-glyph {
  display: block;
  width: 100%;
  height: auto;
  --accent: #4c6fff;
  --accent-soft: rgba(76, 111, 255, .18);
}

.persona-glyph[data-persona='contrarian'] {
  --accent: #ff493d;
  --accent-soft: rgba(255, 73, 61, .18);
}

.persona-glyph[data-persona='picky'] {
  --accent: #c7ff3d;
  --accent-soft: rgba(199, 255, 61, .16);
}

.persona-glyph[data-persona='adventurer'] {
  --accent: #ff8a3d;
  --accent-soft: rgba(255, 138, 61, .18);
}

.persona-glyph[data-persona='valueHunter'] {
  --accent: #ffbf3d;
  --accent-soft: rgba(255, 191, 61, .18);
}

.persona-glyph[data-persona='homebody'] {
  --accent: #c7ff3d;
  --accent-soft: rgba(199, 255, 61, .18);
}

.persona-glyph[data-persona='foodFanatic'] {
  --accent: #ff6b3d;
  --accent-soft: rgba(255, 107, 61, .18);
}

.glyph-bg {
  fill: #111114;
  stroke: #2a2a31;
  stroke-width: 2;
}

.glyph-orbit {
  fill: none;
  stroke: #26262d;
  stroke-width: 2;
}

.glyph-grid {
  fill: none;
  stroke: #1d1d22;
  stroke-width: 1;
}

.ink {
  fill: #f5f5f2;
}

.paper {
  fill: #111114;
}

.accent {
  fill: var(--accent);
}

.accent-soft {
  fill: var(--accent-soft);
  stroke: var(--accent);
  stroke-width: 2;
}

.stroke {
  fill: none;
  stroke: #111114;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.accent-stroke {
  fill: none;
  stroke: var(--accent);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.glyph-dot {
  fill: var(--accent);
}
</style>
