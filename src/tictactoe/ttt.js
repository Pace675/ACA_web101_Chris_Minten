
var previousPlay = null
function addGamePiece (selectedElement) {
// creating element
var newElement = document.createElement('h1')

previousPlay = setGamePiece()
newElement.innerText = previousPlay
selectedElement.appendChild(newElement)
}
var whosTurn = true
var squarePlayed = false
function setGamePiece() {
console.log('status', [previousPlay])
console.log('whosTurn', [whosTurn], [squarePlayed])
if (previousPlay === 'x' && whosTurn) {
  whosTurn === !whosTurn
  squarePlayed === !squarePlayed
return 'o'
} else if (previousPlay === 'o') {
return 'x'
} else {
return 'x'

}
}