/* global chrome */
import m from 'mithril'
import moment from 'moment'
import uid from 'pico-uid'

import '../css/base.css'
import '../css/background.css'

import '../img/icon-128.png'

function makeTabGroup(tabsArr) {
    const tabGroup = {
        date: new Date(),
        id: uid()
    }

    tabGroup.tabs = tabsArr

    return tabGroup
}

function saveTabGroup(tabGroup) {
    chrome.storage.sync.get('tabGroups', storage => {
        let newArr

        if (storage.tabGroups) {
            newArr = storage.tabGroups
            newArr.push(tabGroup)

            chrome.storage.sync.set({ tabGroups: newArr })
        } else {
            chrome.storage.sync.set({ tabGroups: [tabGroup] })
        }
    })
}

function closeTabs(tabsArr) {
    const tabsToClose = []

    for (let i = 0; i < tabsArr.length; i += 1) {
        tabsToClose.push(tabsArr[i].id)
    }

    chrome.tabs.remove(tabsToClose, function() {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError)
        }
    })
}

function saveTabs(tabsArr) {
    const tabGroup = makeTabGroup(tabsArr)
    saveTabGroup(tabGroup)
}

function openBackgroundPage() {
    chrome.tabs.create({ url: chrome.extension.getURL('background.html') })
}

chrome.runtime.onMessage.addListener((req, sender, sendRes) => {
  let isOpen = false
  const tabs = req.tabsArr.filter(tab => {
    if (tab.url.indexOf('chrome-extension://') === -1 ) {
      isOpen = true
      return true
    }

    return false
  })

    const handlers = {
        save: () => {
            saveTabs(tabs)
            !isOpen && openBackgroundPage()
            closeTabs(tabs)
            sendRes('ok')
        },
        saveActive: () => {
          const tab = tabs.filter(tab => tab.active)
          saveTabs(tab)
          !isOpen && openBackgroundPage()
          closeTabs(tab)
          sendRes('ok')
        },
        openbackgroundpage: () => {
            !isOpen && openBackgroundPage()
            sendRes('ok')
        }
    }

    handlers[req.action] ? handlers[req.action]() : sendRes('nope')
})

chrome.storage.sync.get(storage => {
    const tabs = {}
    const tabGroups = storage.tabGroups || []
    const opts = storage.options || { deleteTabOnOpen: 'no' }

    function saveTabGroups(json) {
        chrome.storage.sync.set({ tabGroups: json })
    }

    tabs.TabGroup = function(data) {
        this.date = m.prop(data.date)
        this.id = m.prop(data.id)
        this.tabs = m.prop(data.tabs)
    }

    tabs.TabGroupsList = Array

    tabs.vm = new function() {
        const vm = {}
        vm.init = function() {
            vm.list = new tabs.TabGroupsList()

            vm.rmGroup = i => {
                vm.list.splice(i, 1)
                tabGroups.splice(i, 1)
                saveTabGroups(tabGroups)
            }

            vm.rmTab = (i, j) => {
              console.log(i, j)
                // vm.list[i].tabs().splice(j, 1)
                tabGroups[i].tabs.splice(j, 1)
                saveTabGroups(tabGroups)
            }
        }
        return vm
    }()

    tabs.controller = function() {
        tabs.vm.init()
        for (let i = 0; i < tabGroups.length; i += 1) {
            tabs.vm.list.push(new tabs.TabGroup(tabGroups[i]))
        }
    }

    tabs.view = function() {
        if (tabs.vm.list.length === 0) {
            return m('p', 'No tab groups have been saved yet, or you deleted them all...')
        }

        return tabs.vm.list.map(function(group, i) {
            return m('div.group', [
                m('div.group-title', [
                    m('span.delete-link', {
                        onclick: function() {
                            tabs.vm.rmGroup(i)
                        }
                    }),
                    m('span.group-amount', group.tabs().length + ' Tabs'),
                    ' ',
                    m('span.group-date', moment(group.date()).format('HH:mm:ss, YYYY-MM-DD')),
                    ' ',
                    m(
                        'span.restore-all',
                        {
                            onclick: function() {
                                if (opts.deleteTabOnOpen === 'yes') {
                                    tabs.vm.rmGroup(i)
                                }

                                for (let i = 0; i < group.tabs().length; i += 1) {
                                    chrome.tabs.create({
                                        url: group.tabs()[i].url,
                                        pinned: group.tabs()[i].pinned
                                    })
                                }
                            }
                        },
                        'Restore group'
                    )
                ]),

                // foreach tab
                m(
                    'ul',
                    group.tabs().map((tab, j) => {
                        return m('li', [
                            m('span.delete-link', {
                                onclick: function() {
                                    tabs.vm.rmTab(i, j)
                                }
                            }),
                            m('img', { src: tab.favIconUrl, height: '16', width: '16' }),
                            ' ',
                            m(
                                'span.link',
                                {
                                    onclick: () => {
                                        if (opts.deleteTabOnOpen === 'yes') {
                                            tabs.vm.rmTab(i, j)
                                        }

                                        chrome.tabs.create({
                                            url: tab.url,
                                            pinned: tab.pinned
                                        })
                                    }
                                },
                                tab.title
                            )
                        ])
                    })
                )
            ])
        })
    }

    // init the app
    m.module(document.getElementById('groups'), {
        controller: tabs.controller,
        view: tabs.view
    })
})
