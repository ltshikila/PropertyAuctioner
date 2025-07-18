const ws = new WebSocket('ws://localhost:3000');

/*ws.onopen = () => {
    console.log('Connected to server');
};*/

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    const { status, source, type, message } = data;
    console.log(data);
    switch (status) {
        case 'success':
            switch (source) {
                case 'Login':
                    handleLoginResponse(data);
                    break;
                case 'GetAuction':
                    populateAuctions(data.data.data);
                    break;
                case 'GetAuction(ID)':
                    displayAuctionDetails(data.data.data[0]);
                    break;
                case 'CreateAuction':
                    handleAuctionCreatedResponse(data);
                    break;
                
            }
            /**/
        case 'error':
            handleError(data);
            break;
        default:
            console.log('Unknown message type:', data);
            break;
    }
    //alert notifications
    if (type === 'info') {
        alert(message);
        return;
    }
};

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    // Clear previous error messages
    loginError.textContent = '';

    // Validate input
    if (!username || !password) {
        loginError.textContent = 'Username and password are required.';
        return;
    }

    const data = {
        type: 'Login',
        username: username,
        password: password
    };
    ws.send(JSON.stringify(data));
}

function handleLoginResponse(data) {
    if (data.status === 'success') {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('auctionsPage').style.display = 'block';
        //document.getElementById('joinAuctionContainer').style.display = 'block';
    } else {
        document.getElementById('loginError').textContent = data.message || 'Login failed. Please try again.';
    }
}

function handleAuctionCreatedResponse(data) {
    if (data.status === 'success') {
        // Clear form fields
        document.getElementById('auctionName').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('propertyTitle').value = '';
        document.getElementById('listingprice').value = '';
        document.getElementById('listinglocation').value = '';
        document.getElementById('listingbedrooms').value = '';
        document.getElementById('listingbathrooms').value = '';
        document.getElementById('listingparkingspaces').value = '';
        document.getElementById('listingamenities').value = '';
        document.getElementById('listingdescription').value = '';
        document.getElementById('listingimage').value = '';

        alert(`New Auction (${data.data}) created successfully.`);
        // Hide the auction form and show the auctions page again
        document.getElementById('auctionForm').style.display = 'none';
        document.getElementById('auctionsPage').style.display = 'block';
    } else {
        alert('Failed to create auction.');
    }
}

function handleJoinAuctionResponse(data) {
    if (data.status === 'success') {
        document.getElementById('joinAuctionContainer').style.display = 'none';
        document.getElementById('auctionDetailsContainer').style.display = 'block';
        //updateAuctionDetails(data.details);
    } else {
        document.getElementById('joinError').textContent = data || 'Failed to join auction.';
    }
}

function handleBidResponse(data) {
    if (data.status === 'success') {
        document.getElementById('bidError').textContent = '';
    } else {
        document.getElementById('bidError').textContent = data.message || 'Failed to place bid.';
    }
}

function handleError(data) {
    if (data.source === 'Login') {
        document.getElementById('loginError').textContent = data.message.data;
    } else if (data.source === 'CreateAuction') {
        document.getElementById('createError').textContent = data.message;
    }
}

function createAuction() {
    const auctionName = document.getElementById('auctionName').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const propertyTitle = document.getElementById('propertyTitle').value;
    const listingprice = document.getElementById('listingprice').value;
    const listinglocation = document.getElementById('listinglocation').value;
    const listingbedrooms = document.getElementById('listingbedrooms').value;
    const listingbathrooms = document.getElementById('listingbathrooms').value;
    const listingparkingspaces = document.getElementById('listingparkingspaces').value;
    const listingamenities = document.getElementById('listingamenities').value;
    const listingdescription = document.getElementById('listingdescription').value;
    const listingimage = document.getElementById('listingimage').value;

    // Validate input
    if (!auctionName || !startDate || !endDate || !propertyTitle || !listingprice || !listinglocation || !listingbedrooms || !listingbathrooms
         || !listingparkingspaces || !listingamenities || !listingdescription || !listingimage) {
        document.getElementById('createError').textContent = 'All fields are required to create an auction.';
        return;
    }

    const auctionData = {
        type: 'CreateAuction',
        auction_name: auctionName,
        auction_start_date: startDate,
        auction_end_date: endDate,
        listing_title: propertyTitle,
        listing_price: listingprice,
        listing_location: listinglocation,
        listing_bedrooms: listingbedrooms,
        listing_bathrooms: listingbathrooms,
        listing_parking_spaces: listingparkingspaces,
        listing_amenities: listingamenities,
        listing_description: listingdescription,
        listing_image: listingimage,
        highest_bid: 0,
    };
    ws.send(JSON.stringify(auctionData));
}

function populateAuctions(auctions) {
    const auctionsList = document.getElementById('auctionsList');
    auctionsList.innerHTML = ''; // Clear previous listings

    if (!Array.isArray(auctions)) {
        console.error('Invalid data: auctions should be an array');
        return;
    }

    auctions.forEach(function(auction) {
        // Create list item for current auction
        const listItem = document.createElement('li');
        listItem.classList.add('auction-item');

        // Create image element for auction image
        const imageElement = document.createElement('img');
        imageElement.src = auction.listing_image || "../../images/loading.gif";
        imageElement.alt = auction.listing_title;
        listItem.appendChild(imageElement);

        // Create details container for auction details
        const detailsContainer = document.createElement('div');
        detailsContainer.classList.add('details');

        // Populate auction details
        const detailsHTML = `
            <h3 class="auction-name">${auction.auction_name}</h3>
            <p class="price">Price: R${auction.listing_price}</p>
            <p class="highest-bid">Highest Bid: R${auction.highest_bid}</p>
            <p class="auction-state">State: ${auction.auction_state}</p>
            <p class="auction-dates">Start: ${auction.auction_start_date} - End: ${auction.auction_end_date}</p>
            <button class="join-auction-btn" data-auction-id="${auction.auction_id}">Join Auction</button>
        `;
        detailsContainer.innerHTML = detailsHTML;
        listItem.appendChild(detailsContainer);

        // Append the list item to the auctions list
        auctionsList.appendChild(listItem);
    });

    // Add event listeners to join auction buttons
    const joinButtons = document.querySelectorAll('.join-auction-btn');
    joinButtons.forEach(button => {
        button.addEventListener('click', function() {
            const auctionId = this.getAttribute('data-auction-id');
            joinAuction(auctionId);
        });
    });
}

// Function to handle joining an auction
function joinAuction(auctionId) {
    // Placeholder for WebSocket request to get auction details
    //const ws = new WebSocket('ws://localhost:3000');
    const data = {
        type: 'GetAuction',
        search:{
            auction_id: auctionId
        }
    };
    ws.send(JSON.stringify(data));
}

// Function to display auction details
function displayAuctionDetails(auction) {
    //const auctionDetailsPage = document.getElementById('auctionDetails');
    const auctionDetails = document.getElementById('auctionDetails');

    // Populate auction details
    const detailsHTML = `
        <h3>${auction.auction_name}</h3>
        <img src="${auction.listing_image}" alt="${auction.listing_title}">
        <p>${auction.listing_title}</p>
        <p>Price: R${auction.listing_price}</p>
        <p>Location: ${auction.listing_location}</p>
        <p>Bedrooms: ${auction.listing_bedrooms}</p>
        <p>Bathrooms: ${auction.listing_bathrooms}</p>
        <p>Parking Spaces: ${auction.listing_parking_spaces}</p>
        <p>Amenities: ${auction.listing_amenities}</p>
        <p>${auction.listing_description}</p>
        <p>Highest Bid: R${auction.highest_bid}</p>
        <p>Auction State: ${auction.auction_state}</p>
        <p>Start: ${auction.auction_start_date} - End: ${auction.auction_end_date}</p>
        <button class="bid-btn" data-auction-id="${auction.auction_id}">Bid</button>
        <button class="back">Cancel</button> 
    `;
    auctionDetails.innerHTML = detailsHTML;

    // Attach event listener to the bid button
    const bidButton = auctionDetails.querySelector('.bid-btn');
    bidButton.addEventListener('click', function() {
        const auctionId = this.getAttribute('data-auction-id');
        bid(auctionId);
    });

    // Attach event listener to the back button
    const backButton = auctionDetails.querySelector('.back');
    backButton.addEventListener('click', function() {
        document.getElementById('auctionDetails').style.display = 'none';
        document.getElementById('auctionsPage').style.display = 'block';
    });

    // Show auction details page
    document.getElementById('auctionsPage').style.display = 'none';
    auctionDetails.style.display = 'block';
}

// Define the bid function
function bid(auctionId) {
    const newBid = prompt("Enter your new bid:");
    if (newBid) {
        // Call updateAuction with the new bid
        updateAuction(auctionId, newBid);
    }
}

// Define the updateAuction function
function updateAuction(auctionId, bidAmount) {
    const data = {
        type: 'UpdateAuction',
        auction_id: auctionId,
        highest_bid: bidAmount
    };

    ws.send(JSON.stringify(data));
}

// Function to show the auction form
function showAuctionForm() {
    document.getElementById('auctionsPage').style.display = 'none';
    document.getElementById('auctionForm').style.display = 'block';
}

function toAuctionsPage(){
    document.getElementById('auctionForm').style.display = 'none';
    document.getElementById('auctionsPage').style.display = 'block';
}