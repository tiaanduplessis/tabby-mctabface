/* global chrome */
import '../css/base.css'
import '../css/options.css'

document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get('options', function(storage) {
        const opts = storage.options || {}

        if (opts.deleteTabOnOpen === undefined) {
            document
                .querySelector('input[name="deleteTabOnOpen"][value="no"]')
                .setAttribute('checked', 'checked')
            return
        }

        document
            .querySelector('input[name="deleteTabOnOpen"][value="' + opts.deleteTabOnOpen + '"]')
            .setAttribute('checked', 'checked')
    })
})

document.getElementsByName('save')[0].addEventListener('click', function() {
    var deleteTabOnOpen = document.querySelector('input[name="deleteTabOnOpen"]:checked').value

    chrome.storage.sync.set({ options: { deleteTabOnOpen: deleteTabOnOpen } }, function() {
        // show "settings saved" notice thing
        document.getElementById('saved').style.display = 'block'
        window.setTimeout(function() {
            document.getElementById('saved').style.display = 'none'
        }, 1000)
    })
})
