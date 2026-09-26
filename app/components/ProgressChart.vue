<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const props = defineProps<{
  labels: string[]
  topWeight?: number[]
  best1RM?: number[]
  // Body-weight exercises chart reps instead of weight.
  reps?: number[]
}>()

const data = computed(() => ({
  labels: props.labels,
  datasets: props.reps
    ? [
        {
          label: 'Top reps',
          data: props.reps,
          borderColor: '#00C16A',
          backgroundColor: 'rgba(0,193,106,0.15)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        }
      ]
    : [
        {
          label: 'Top weight',
          data: props.topWeight ?? [],
          borderColor: '#00C16A',
          backgroundColor: 'rgba(0,193,106,0.15)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        },
        {
          label: 'Est. 1RM',
          data: props.best1RM ?? [],
          borderColor: '#94a3b8',
          borderDash: [4, 4],
          tension: 0.3,
          pointRadius: 0
        }
      ]
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: { legend: { display: true, position: 'bottom' as const } },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: false }
  }
}
</script>

<template>
  <div class="h-56">
    <Line
      :data="data"
      :options="options"
    />
  </div>
</template>
