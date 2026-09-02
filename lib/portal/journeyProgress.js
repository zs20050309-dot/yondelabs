/**
 * Progress figures derived from data that already exists — milestones and the
 * student's own milestone progress. Nothing here invents state: if a value
 * cannot be derived it is null and the UI shows an honest empty state.
 */

export function phaseProgress(phase) {
  const items = phase.milestones || []
  if (!items.length) return { percent: 0, completed: 0, total: 0 }
  const completed = items.filter((m) => m.status === 'completed').length
  const inProgress = items.filter((m) => m.status === 'in_progress').length
  // Half credit for in-progress work, so the bar moves between completions
  // rather than jumping only at the end of a milestone.
  return {
    completed,
    total: items.length,
    percent: Math.round(((completed + inProgress * 0.5) / items.length) * 100),
  }
}

export function summarise(phases = []) {
  const milestones = phases.flatMap((phase) => phase.milestones || [])
  const total = milestones.length
  const completed = milestones.filter((m) => m.status === 'completed').length
  const inProgress = milestones.filter((m) => m.status === 'in_progress').length

  return {
    total,
    completed,
    percent: total ? Math.round(((completed + inProgress * 0.5) / total) * 100) : 0,
    currentPhase: phases.find((phase) => phase.status === 'current') || null,
    nextMilestone:
      milestones.find((m) => m.status === 'in_progress')
      || milestones.find((m) => m.status !== 'completed')
      || null,
  }
}
