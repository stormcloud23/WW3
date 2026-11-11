export const factions = {
  US: ['Rifle Section', 'Scout Carrier', 'Main Battle Tank', 'Field Battery'],
  China: ['Line Infantry', 'Recon Vehicle', 'Armored Platoon', 'Support Battery'],
  Russia: ['Motor Rifle Section', 'Recon Carrier', 'Guards Armor', 'Field Artillery'],
  'EU Coalition': ['Coalition Infantry', 'Scout Car', 'Heavy Armor', 'Gun Battery'],
}

export const classes = [
  { role: 'Infantry', cost: 2, hp: 4, move: 3, min: 1, range: 1, damage: [2, 2, 1, 2] },
  { role: 'Recon', cost: 3, hp: 4, move: 5, min: 1, range: 1, damage: [3, 2, 1, 3] },
  { role: 'Armor', cost: 5, hp: 6, move: 4, min: 1, range: 1, damage: [2, 4, 3, 4] },
  { role: 'Artillery', cost: 4, hp: 3, move: 2, min: 2, range: 3, damage: [3, 2, 2, 2] },
]

export const map = [
  '..ff..~......',
  '...f..~.fff..',
  '.....f~......',
  '......b..t...',
  '..t.o...o.t..',
  '...t..b......',
  '......~f.....',
  '..fff.~..f...',
  '......~..ff..',
]

export const width = map[0].length
export const terrain = index => map[Math.floor(index / width)][index % width]
export const objectives = Array.from({ length: width * map.length }, (_, i) => i)
  .filter(i => terrain(i) === 'o')
const distance = (a, b) =>
  Math.abs(a % width - b % width) + Math.abs(Math.floor(a / width) - Math.floor(b / width))
const adjacent = index => [index - width, index + width, index - 1, index + 1]
  .filter(i => i >= 0 && i < width * map.length && distance(i, index) === 1)

export function start(players) {
  return {
    players: players.map(player => ({ ...player, points: 8, score: 0 })),
    units: [], active: 0, round: 1, winner: null,
  }
}

export function deployment(state, type) {
  const player = state.players[state.active]
  if (state.winner !== null || !player.deck.includes(type) || player.points < classes[type].cost) return []
  const x = state.active === 0 ? 0 : width - 1
  return map.map((_, y) => y * width + x).filter(i => !state.units.some(unit => unit.at === i))
}

export function deploy(state, type, at) {
  if (!deployment(state, type).includes(at)) return
  state.players[state.active].points -= classes[type].cost
  state.units.push({ type, at, owner: state.active, hp: classes[type].hp, moved: true, fired: true })
}

export function moves(state, unit) {
  if (state.winner !== null || unit.owner !== state.active || unit.moved || unit.fired) return []
  const budget = classes[unit.type].move
  const costs = new Map([[unit.at, 0]])
  const frontier = [unit.at]
  for (let step = 0; step < frontier.length; step++) {
    const from = frontier[step]
    for (const to of adjacent(from)) {
      const tile = terrain(to)
      if (tile === '~' || state.units.some(other => other.at === to)) continue
      const cost = costs.get(from) + (tile === 'f' && unit.type !== 0 ? 2 : 1)
      if (cost > budget || cost >= (costs.get(to) ?? Infinity)) continue
      costs.set(to, cost)
      frontier.push(to)
    }
  }
  return [...costs.keys()].filter(i => i !== unit.at)
}

export function targets(state, unit) {
  if (state.winner !== null || unit.owner !== state.active || unit.fired || (unit.type === 3 && unit.moved)) return []
  const { min, range } = classes[unit.type]
  return state.units.filter(other => {
    const gap = distance(unit.at, other.at)
    return other.owner !== unit.owner && gap >= min && gap <= range
  }).map(other => other.at)
}

export function move(state, unit, at) {
  if (!moves(state, unit).includes(at)) return
  unit.at = at
  unit.moved = true
}

export function attack(state, unit, at) {
  if (!targets(state, unit).includes(at)) return
  const target = state.units.find(other => other.at === at)
  const cover = target.type === 0 && ['f', 't'].includes(terrain(at)) ? 1 : 0
  const damage = Math.max(1, classes[unit.type].damage[target.type] - cover)
  target.hp -= damage
  unit.fired = true
  if (target.hp <= 0) state.units = state.units.filter(other => other !== target)
  return damage
}

export function endTurn(state) {
  if (state.winner !== null) return
  const player = state.players[state.active]
  player.score += objectives.filter(at => state.units.some(unit => unit.at === at && unit.owner === state.active)).length
  if (player.score >= 8) {
    state.winner = state.active
    return
  }
  state.active = 1 - state.active
  if (state.active === 0) state.round++
  if (state.round > 1) state.players[state.active].points += 4
  for (const unit of state.units) {
    if (unit.owner !== state.active) continue
    unit.moved = false
    unit.fired = false
  }
}
