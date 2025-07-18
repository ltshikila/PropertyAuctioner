const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

const app = express();
const API_BASE_URL = 'https://wheatley.cs.up.ac.za/u22644106/COS216/HA/api.php';
const API_USERNAME = 'u22644106';
const API_PASSWORD = 'Narutouzumaki1010';

// Serve static files from the 'public' directory
app.use(express.static('public'));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Port selection
rl.question('Enter port number (1024-49151): ', (port) => {
    const portNum = parseInt(port);
    if (portNum < 1024 || portNum > 49151) {
        console.error('Port number must be in the range 1024-49151');
        process.exit(1);
    }

    const server = app.listen(portNum, () => {
        console.log(`Server is listening on port ${portNum}`);
        getAllAuctions(); // Call function to populate auctions object
    });

    const wss = new WebSocket.Server({ server });

    let clients = {};
    let auctions = {};

    // Commands to handle server operations
    rl.on('line', (input) => {
        const [command, ...args] = input.trim().split(' ');
        switch (command) {
            case 'LIST':
                listClients();
                break;
            case 'KILL':
                if (args.length < 1) {
                    rl.question('Enter username to kill: ', (username) => {
                        killClient(username);
                    });
                } else {
                    killClient(args[0]);
                }
                break;
            case 'QUIT':
                quitServer();
                break;
            case 'AUCTIONS':
                listAuctions();
                break;
            default: 
                console.log('Unknown command');
        }
    });

    let referenceWs = null; // Store a reference to one WebSocket connection

    // When a new WebSocket connection is established, store the reference if it's null
    wss.on('connection', (ws) => {
        if (!referenceWs) {
            referenceWs = ws;
        }

        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            const { type, username } = data; // Extract username

            switch (type) {
                case 'Register':
                    await handleUserRegistration(data, ws);
                    clients[username] = ws;
                    break;
                case 'Login':
                    await handleUserLogin(data, ws);
                    clients[username] = ws;
                    break;
                case 'CreateAuction':
                    await handleCreateAuction(data, ws);
                    break;
                case 'UpdateAuction':
                    await handleUpdateAuction(data.auction_id, data.highest_bid, ws);
                    break;
                case 'GetAuction':
                    await handleGetAuction(data, ws);
                    break;
                default:
                    ws.send(JSON.stringify({ status: 'error', message: 'Unknown command' }));
            }
        });

        ws.on('close', () => {
            for (let user in clients) {
                if (clients[user] === ws) {
                    console.log(`${user} has disconnected`);
                    delete clients[user];
                    break;
                }
            }

            // If the reference WebSocket disconnects, reset it
            if (referenceWs === ws) {
                referenceWs = null;
            }
        });
    });
    
    // Function to handle user login
    async function handleUserLogin(data, ws) {
      const { username, password } = data;
      const requestData = {
          username: username,
          password: password,
          type: 'Login'
      };

      try {
          const response = await axios.post(API_BASE_URL, requestData, {
              auth: {
                  username: API_USERNAME,
                  password: API_PASSWORD,
              },
          });
          console.log(`${username} has connected`);
          ws.send(JSON.stringify({ status: 'success', message: 'Login successful', source: 'Login', apiKey: response.data.apikey }));
          handleGetAuction({ "search": '*',"type": 'GetAuction'}, ws);
         
      } catch (error) {
          ws.send(JSON.stringify({ status: 'error', source: 'Login', message: error.response.data }));
      }
    }

    
    
    // Function to retrieve auction details based on search criteria
    async function handleGetAuction(data, ws) {
        const { search } = data;
   
        const auctionId = search.auction_id;
        //console.log('Auction ID:', auctionId);
        
      try {
          const response = await axios.post(API_BASE_URL, data, {
              auth: {
                  username: API_USERNAME,
                  password: API_PASSWORD,
              },
          });
          if (auctionId === undefined){
            ws.send(JSON.stringify({ status: 'success', source: 'GetAuction', message: 'Auction details retrieved successfully', data: response.data }));
          }else{
            ws.send(JSON.stringify({ status: 'success', source: 'GetAuction(ID)', message: 'Auction details retrieved successfully', data: response.data }));
          }
          
      } catch (error) {
          ws.send(JSON.stringify({ status: 'error', source: 'GetAuction', message: error.response.data }));
      }
    }

    // Function to retrieve all auctions from the API and populate the auctions object
    async function getAllAuctions() {
        const requestData = {
            search: '*',
            type: 'GetAuction'
        };

        try {
            const response = await axios.post(API_BASE_URL, requestData, {
                auth: {
                    username: API_USERNAME,
                    password: API_PASSWORD,
                },
            });

            if (response.data.status === 'success') {
                response.data.data.forEach((auction) => {
                    auctions[auction.auction_id] = auction;
                });

                console.log('Auctions retrieved and populated successfully');
            } else {
                console.error('Error retrieving auctions:', response.data.message);
            }
        } catch (error) {
            console.error('Error retrieving auctions:', error.response ? error.response.data : error.message);
        }
    }


    const handleCreateAuction = async (data, ws) => {
        const auctionId = generateUniqueAuctionId();
        const requestData = {
        
            auction_id: auctionId,
            auction_name: data.auction_name,
            auction_start_date: data.auction_start_date,
            auction_end_date: data.auction_end_date,
            listing_title: data.listing_title,
            listing_price: data.listing_price,
            listing_location: data.listing_location,
            listing_bedrooms: data.listing_bedrooms,
            listing_bathrooms: data.listing_bathrooms,
            listing_parking_spaces: data.listing_parking_spaces,
            listing_amenities: data.listing_amenities,
            listing_description: data.listing_description,
            listing_image: data.listing_image,
            highest_bid: data.highest_bid,
            type: 'CreateAuction'
        };

        try {
            // Make POST request to create auction
            await axios.post(API_BASE_URL, requestData, {
                auth: {
                    username: API_USERNAME,
                    password: API_PASSWORD,
                },
            });

            // Update the local auctions object with the new auction details
            auctions[auctionId] = {
                ...data,
                auction_state: 'Waiting',
                highest_bidder: null,
                auctionId
            };

            // Send a success message back to the client, including the auctionId
            ws.send(JSON.stringify({ status: 'success', source: 'CreateAuction', data:auctionId }));
            handleGetAuction({ "search": '*',"type": 'GetAuction'}, ws);
        } catch (error) {
            // Log the error and send an error message back to the client
            console.error('Error creating auction:', error.response ? error.response.data : error.message);
            ws.send(JSON.stringify({ status: 'error', source: 'CreateAuction', message: 'Failed to create auction' }));
        }
    };
   
    function getUsernameFromWebSocket(ws) {
        // Iterate over clients to find the username associated with the WebSocket connection
        for (const [username, socket] of Object.entries(clients)) {
            if (socket === ws) {
                return username; // Return the username associated with the WebSocket connection
            }
        }
        return null; // WebSocket connection not found in clients
    }


    function checkAuctionTimes() {
        const now = new Date();
    
        Object.keys(auctions).forEach(auctionId => {
            const auction = auctions[auctionId];
            const auctionStartDate = new Date(auction.auction_start_date.replace(' ', 'T')); // Converts to 'YYYY-MM-DDTHH:MM:SS'
            const auctionEndDate = new Date(auction.auction_end_date.replace(' ', 'T')); // Converts to 'YYYY-MM-DDTHH:MM:SS'
            if (auction.auction_state === 'Waiting' && now >= auctionStartDate) {
                auction.auction_state = 'Ongoing';
                broadcastMessage('info', `Auction ${auction.auction_name} has started`);
                handleUpdateAuction(auctionId, auction.highest_bid, referenceWs, true);
            } else if (auction.auction_state === 'Ongoing' && now >= auctionEndDate) {
                auction.auction_state = 'Done';
                broadcastMessage('info', `Auction ${auction.auction_name} has ended. Highest bid: ${auction.highest_bid}`);
                handleUpdateAuction(auctionId, auction.highest_bid, referenceWs, true);
            }
        });
        /*if(referenceWs){
            handleGetAuction({ "search": '*', "type": 'GetAuction' }, referenceWs);
        }*/
        
    }

    // Start interval to check auction times every 10s
    setInterval(checkAuctionTimes, 10000);

    // Modify handleUpdateAuction to handle state updates without a WebSocket
    async function handleUpdateAuction(auctionId, bid, ws, isStateChange = false) {
        const username = ws ? getUsernameFromWebSocket(ws) : null;
        
        if (!auctions[auctionId]) { 
            if (ws) {
                ws.send(JSON.stringify({ status: 'error', message: 'Auction not found' }));
            }
            return;
        }

        const auction = auctions[auctionId];
        //const now = new Date().toISOString();

        if (isStateChange) {
            // Only change the auction state without bid processing
            const requestData = {
                type: 'UpdateAuction',
                auction_id: auctionId,
                highest_bid: auction.highest_bid,
                auction_state: auction.auction_state,
                buyer_id: auction.highest_bidder || null
            };

            try {
                await axios.patch(API_BASE_URL, requestData, {
                    auth: {
                        username: API_USERNAME,
                        password: API_PASSWORD,
                    },
                });

                // Update auction data for all clients
                broadcastMessage('info', `Auction ${auction.auction_name} state updated to ${auction.auction_state}`);
                
                handleGetAuction({ "search": '*', "type": 'GetAuction' }, ws);
                
                
            } catch (error) {
                console.error('Error updating auction state:', error.response ? error.response.data : error.message);
            }

            return;
        }

        if (username && bid > auction.highest_bid) {
            auction.highest_bid = bid;
            auction.highest_bidder = username;

            const requestData = {
                type: 'UpdateAuction',
                auction_id: auctionId,
                highest_bid: auction.highest_bid,
                auction_state: auction.auction_state,
                buyer_id: auction.highest_bidder || null
            };

            try {
                await axios.patch(API_BASE_URL, requestData, {
                    auth: {
                        username: API_USERNAME,
                        password: API_PASSWORD,
                    },
                });

                // Notify all clients about the new highest bid
                broadcastMessage('info', `New highest bid on auction ${auction.auction_name}: ${auction.highest_bid} by ${username}`);

                // Update auction data for all clients
                handleGetAuction({ "search": '*', "type": 'GetAuction' }, ws);
            } catch (error) {
                console.error('Error updating auction:', error.response ? error.response.data : error.message);
            }
        }
    }


    function broadcastMessage(type, message) {
        const notification = JSON.stringify({ type, message });
        for (const user in clients) {
        clients[user].send(notification);
        }
    }



    function listClients() {
        console.log('Connected clients:');
        for (let user in clients) {
            console.log(`Username: ${user}, SocketID: ${clients[user]._socket.remotePort}`);
        }
    }

    function killClient(username) {
        if (clients[username]) {
            clients[username].terminate();
            delete clients[username];
            console.log(`Killed connection for user: ${username}`);
        } else {
            console.log(`No connection found for user: ${username}`);
        }
    }

    function quitServer() {
        for (let user in clients) {
            clients[user].send(JSON.stringify({ status: 'info', message: 'Server is shutting down' }));
            clients[user].terminate();
        }
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    }

    function listAuctions() {
        console.log('Current auctions:');
        for (let id in auctions) {
            console.log(`AuctionID: ${id}, AuctionName: ${auctions[id].auction_name}, HighestBid: ${auctions[id].highest_bid}`);
        }
    }

    function generateUniqueAuctionId() {
        return uuidv4().replace(/-/g, '').slice(0, 10);
    }

    
});
