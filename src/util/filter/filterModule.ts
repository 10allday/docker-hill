const filterList = require("./filter.json")

let regex = new RegExp(filterList.join("|"), "i")

export interface filterModule {
    getFilter(): string[]
    setFilter(filter: string[])
    isSwear(input: string): boolean
}

function setFilter(filter: string[]) {
    regex = new RegExp(filter.join("|"), "i")
}

function getFilter(): string[] {
    return filterList
}

function isSwear(input: string): boolean {
    return regex.test(input)
}

export default { getFilter, setFilter, isSwear }