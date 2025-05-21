QLC+ DMX Re-Patching Utility

QLC+ is an amazing piece of software, but there are a couple of things that really bug me. 
One of them is that it’s not possible to create virtual master faders (a sort of DCA), 
and I can understand that this might not be easy to implement. 
But the other issue is so frustrating that I had to do something about it: 
the pain of moving things around when you need to repatch a project (just change addresses, not fixtures).

Installation

1. Copy the three files (HTML, CSS, and JS) into the same folder on your web server.
2. Open `index.html` in your browser.


How to use:

Click Choose File and select your QLC+ project file (.qxw).
The list of fixtures will appear in a table. You can edit the Universe (0-3) and DMX Address (1-512) for each fixture.
Click the first cell of a row to select/deselect it. You can select multiple rows by dragging with the mouse.
When several rows are selected, changing the DMX address of one will shift all selected fixtures by the same amount.
Click column headers to sort by Name, Universe, DMX Address, or Channels.
Conflicts and out-of-range addresses are highlighted in red. Only valid, non-conflicting patches can be saved.
Click Validate new patch to check for conflicts and download the updated file.
Tip: You can use the Select all (✔) and Unselect all (✖) buttons to quickly select or deselect all fixtures.
