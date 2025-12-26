/**
 * CodeHero Draggable Utility
 * Makes modal elements draggable by their header/title.
 */
CodeHero.Utils.Draggable = {};

CodeHero.Utils.Draggable.make = function (elementId, handleId) {
    const elm = document.getElementById(elementId);
    const handle = document.getElementById(handleId) || elm; // Default to self if no handle

    if (!elm) return;

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    handle.onmousedown = dragMouseDown;
    handle.style.cursor = 'grab';

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // Get mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // Call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
        handle.style.cursor = 'grabbing';
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // Calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // Set the element's new position:
        elm.style.top = (elm.offsetTop - pos2) + "px";
        elm.style.left = (elm.offsetLeft - pos1) + "px";
        elm.style.transform = "none"; // Disable centering transform if present
        elm.style.margin = "0"; // Reset margin to avoid offset issues
    }

    function closeDragElement() {
        // Stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        handle.style.cursor = 'grab';
    }
};

// Initialize for all known modals
CodeHero.Utils.Draggable.initAll = function () {
    // We assume the '.modal-box' is the draggable part, and its H2 is the handle
    // But since modals are overlays, we need to target the box specifically.

    const modals = [
        'modal-edit-block',
        'loop-config-modal',
        'victory-modal',
        'defeat-modal',
        'instruction-modal'
    ];

    modals.forEach(id => {
        const modalOverlay = document.getElementById(id);
        if (modalOverlay) {
            const box = modalOverlay.querySelector('.modal-box');
            const handle = box.querySelector('h2');
            if (box && handle) {
                // Assign a temporary ID if needed or just pass elements if refactored.
                // For simplicity, let's attach logic directly here or assign IDs.

                // Let's modify the helper to accept elements directly?
                // Or just use unique IDs for the boxes?
                // Let's rely on the elements directly for stability.
                makeElementDraggable(box, handle);
            }
        }
    });

    function makeElementDraggable(elm, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;
        handle.style.cursor = 'grab';

        function dragMouseDown(e) {
            e = e || window.event;
            // e.preventDefault(); // keep default to allow text selection if needed, but for drag usually prevent

            // Get initial mouse pos
            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            handle.style.cursor = 'grabbing';

            // CRITICAL FIX FOR CENTERED MODALS:
            // If the element is centered via transform translate(-50%, -50%), dragging logic fails.
            // We must convert the CURRENT visual position to explicit Left/Top and remove the transform.
            const rect = elm.getBoundingClientRect();

            // Set explicit position matching current visual state
            elm.style.left = rect.left + 'px';
            elm.style.top = rect.top + 'px';
            elm.style.transform = 'none'; // Disable centering
            elm.style.margin = '0'; // Reset styling limits
            elm.style.position = 'fixed'; // Fixed is better for modals than absolute interacting with scroll
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // Calculate cursor offset
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Set new position
            elm.style.top = (elm.offsetTop - pos2) + "px";
            elm.style.left = (elm.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            handle.style.cursor = 'grab';
        }
    }
};
