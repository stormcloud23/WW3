import {
  factions, classes, map, width, terrain, start, deployment, deploy, moves, targets, move, attack, endTurn,
} from './rules.mjs'

const byId = id => document.getElementById(id)
const setup = byId('setup')
const match = byId('match')
const board = byId('board')
const tiles = { '.': 'Open ground', f: 'Woods', '~': 'River', t: 'Town', b: 'Bridge', o: 'Objective' }
const sprites = [
  '<path d="M5 1h3v3H5zM4 5h5v5H4zM3 5h1v4H3zM9 5h5v2H9zM4 10h2v4H4zM7 10h2v4H7z"/>',
  '<path d="M2 5h11v6H2zM5 3h5v2H5zM3 11h3v2H3zM9 11h3v2H9z"/>',
  '<path d="M2 3h10v2H2zM2 11h10v2H2zM1 5h12v6H1zM5 6h5v4H5zM10 7h5v2h-5z"/>',
  '<path d="M2 8h11v4H2zM4 6h5v2H4zM8 5h3v2H8zM10 3h5v2h-5zM3 12h3v2H3zM9 12h3v2H9z"/>',
]

let state
let selected
let card
let message
const fields = [0, 1].map(side => {
  const field = document.createElement('fieldset')
  field.innerHTML = `<legend>Player ${side + 1}</legend><label>Faction
    <select>${Object.keys(factions).map(name => `<option>${name}</option>`).join('')}</select>
    </label><div class="choices"></div>`
  byId('decks').append(field)
  const select = field.querySelector('select')
  select.selectedIndex = side
  function updateNames() {
    field.querySelectorAll('.unit-name').forEach((name, type) => {
      name.textContent = factions[select.value][type]
    })
  }
  field.querySelector('.choices').innerHTML = classes.map(({ role, cost }, type) => `
    <label><input type="checkbox" value="${type}" ${type !== 2 ? 'checked' : ''}>
    <span><strong class="unit-name"></strong><small>${role} · ${cost} pts</small></span></label>`).join('')
  select.addEventListener('change', updateNames)
  updateNames()
  return field
})

setup.addEventListener('submit', event => {
  event.preventDefault()
  const players = fields.map(field => ({
    faction: field.querySelector('select').value,
    deck: Array.from(field.querySelectorAll('input:checked'), input => Number(input.value)),
  }))
  if (players.some(player => player.deck.length !== 3)) {
    byId('setup-error').textContent = 'Select exactly three cards for each player.'
    return
  }
  byId('setup-error').textContent = ''
  state = start(players)
  setup.hidden = true
  match.hidden = false
  clearSelection()
  render()
  byId('cards').querySelector('button').focus()
})

function clearSelection() {
  selected = null
  card = null
  message = ''
}

function chooseTile(at) {
  if (state.winner !== null) return
  const unit = state.units.find(piece => piece.at === at)
  if (card !== null && deployment(state, card).includes(at)) {
    deploy(state, card, at)
    clearSelection()
    message = 'Reinforcement deployed. It can act next turn.'
  } else if (selected && targets(state, selected).includes(at)) {
    message = `Attack dealt ${attack(state, selected, at)} damage.`
  } else if (selected && moves(state, selected).includes(at)) {
    move(state, selected, at)
    message = ''
  } else {
    clearSelection()
    if (unit?.owner === state.active) selected = unit
    else if (unit) message = describe(unit)
  }
  render()
}

function describe(unit) {
  return `${factions[state.players[unit.owner].faction][unit.type]}, ${unit.hp} HP`
}

const cells = Array.from({ length: width * map.length }, (_, at) => {
  const button = document.createElement('button')
  button.type = 'button'
  button.addEventListener('click', () => chooseTile(at))
  board.append(button)
  return button
})
board.style.setProperty('--columns', width)

function render() {
  const player = state.players[state.active]
  const finished = state.winner !== null
  byId('score').innerHTML = `<strong>${finished ? `Player ${state.winner + 1} wins` :
    `Round ${state.round} · Player ${state.active + 1} · ${player.points} deployment points`}</strong>
    <span>${state.players.map((side, i) => `P${i + 1} ${side.faction} ${side.score}/8`).join('  ·  ')}</span>`
  const movement = selected ? moves(state, selected) : []
  const attacks = selected ? targets(state, selected) : []
  const arrivals = card === null ? [] : deployment(state, card)
  cells.forEach((cell, at) => {
    const tile = terrain(at)
    const unit = state.units.find(piece => piece.at === at)
    const friendlyEdge = at % width === (state.active === 0 ? 0 : width - 1)
    const action = attacks.includes(at) ? 'attack' :
      movement.includes(at) ? 'move' : arrivals.includes(at) ? 'deploy' : ''
    cell.className = ['tile', `terrain-${tile === '.' ? 'plain' : tile}`, action,
      unit && unit === selected ? 'selected' : ''].join(' ')
    const label = [`Column ${at % width + 1}, row ${Math.floor(at / width) + 1}`, tiles[tile],
      friendlyEdge ? 'friendly deployment' : '', unit ? `Player ${unit.owner + 1} ${describe(unit)}` : '',
      action].filter(Boolean).join(', ')
    cell.setAttribute('aria-label', label)
    cell.title = label
    cell.innerHTML = unit ? `<span class="piece side-${unit.owner}">
      <svg aria-hidden="true" viewBox="0 0 16 16">${sprites[unit.type]}</svg><b>${unit.hp}</b></span>` :
      tile === 'o' ? '◇' : friendlyEdge ? '+' : ''
  })
  const cards = byId('cards')
  const focusedCard = document.activeElement?.dataset.type
  cards.innerHTML = player.deck.map(type => {
    const { role, cost, hp, move: speed, min, range } = classes[type]
    return `<button type="button" data-type="${type}" aria-pressed="${card === type}"
      ${deployment(state, type).length ? '' : 'disabled'}>
      <strong>${factions[player.faction][type]}</strong>
      <small>${role} · ${cost} pts · ${hp} HP · Move ${speed} · Range ${min === range ? range : `${min}–${range}`}</small>
    </button>`
  }).join('')
  if (focusedCard !== undefined) cards.querySelector(`[data-type="${focusedCard}"]:enabled`)?.focus()
  byId('orders').textContent = message || (finished ? 'Skirmish complete.' :
    card !== null ? 'Choose a highlighted deployment tile.' :
    selected ? `${describe(selected)}. ${movement.length || attacks.length ? 'Choose a highlighted tile.' : 'No available actions.'}` :
    'Select a friendly unit or a reinforcement card.')
  byId('end').disabled = finished
}

byId('cards').addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button || button.disabled) return
  const type = Number(button.dataset.type)
  const previous = card
  clearSelection()
  if (previous !== type) card = type
  render()
})

byId('end').addEventListener('click', () => {
  endTurn(state)
  clearSelection()
  render()
  if (state.winner !== null) byId('reset').focus()
})

byId('reset').addEventListener('click', () => {
  match.hidden = true
  setup.hidden = false
  fields[0].querySelector('select').focus()
})
