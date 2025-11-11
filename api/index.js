const SearchBasic = require("./search/basic.js")
const SearchAdvanced = require("./search/advanced.js")

const nexus = {
  basic: SearchBasic.basic,
  advanced: SearchAdvanced.advanced
}

module.exports = nexus