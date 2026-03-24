const XKCD = "https://xkcd.now.sh/?comic="


function fetchIssue(num) {
    fetch(XKCD + num)
        .then(response => response.json())
        .then(json => {
            // Affiche le numéro dans la zone de statut
            document.getElementById('num').textContent = json.num;
        });
}

