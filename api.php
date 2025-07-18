<?php

// Check if the request method is POST or PATCH
if ($_SERVER['REQUEST_METHOD'] == 'POST' || $_SERVER['REQUEST_METHOD'] == 'PATCH') {
    // Read the JSON input from the request body
    $postData = file_get_contents("php://input");
    $auctionAPI = new AuctionAPI($postData);
    $auctionAPI->handleRequest();
} else {
    // Return an error response for invalid request method
    sendErrorResponse("Error. Bad Request", 400);
}

// Define the UserAPI class to handle API requests
class AuctionAPI {
    private $request;
    private $dbConnection;
    private $apiKey;

    // Constructor to initialize the UserAPI class
    public function __construct($json_data) {
        // Parse the JSON data
        $this->request = json_decode($json_data, true);
        // Get the database connection
        $this->dbConnection = DatabaseConnection::instance();
    }

    // Handle the API request
    public function handleRequest() {
        // Validate request type
        if (!isset($this->request['type'])) {
            sendErrorResponse("Error. Missing required POST parameter: type", 400);
            return;
        }

        // Check the request type
        switch ($this->request['type']) {
            case 'Login':
                $this->loginUser();
                break;
            case 'Register':
                $this->registerUser();
                break;
            case 'CreateAuction':
                $this->createAuction();
                break;
            case 'UpdateAuction':
                $this->updateAuction();
                break;
            case 'GetAuction':
                $this->getAuction();
                break;
            default:
                sendErrorResponse("Error. Invalid request type", 400);
                break;
        }
    }


    // Function to handle the login request
    private function loginUser() {
        // Validate input data
        if (!isset($this->request['username']) || !isset($this->request['password'])) {
            sendErrorResponse("Error. Missing required fields", 400);
            return;
        }

        $username = $this->request['username'];
        $password = $this->request['password'];

        // Query to check the user's username and fetch the password hash, salt, and apikey
        $stmt = $this->dbConnection->db->prepare("SELECT password, salt, apikey FROM users WHERE username = ?");
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $stmt->store_result();
        $stmt->bind_result($hashedPassword, $salt, $apiKey);

        if ($stmt->num_rows === 1) {
            $stmt->fetch();
            // Hash the provided password with the retrieved salt
            $hashedInputPassword = hash('sha256', $password . $salt);

            // Verify the hashed input password matches the stored hashed password
            if ($hashedInputPassword === $hashedPassword) {
                // Password is correct, return the API key
                sendSuccessResponse(['apikey' => $apiKey]);
                $stmt->close();
                return;
            }
        }

        // Invalid credentials or username not found
        sendErrorResponse("Invalid username or password", 401);
        $stmt->close();
    }


    // Function to register a new user
    private function registerUser() {
        // Validate input data
        if (!isset($this->request['username']) || !isset($this->request['password'])) {
            sendErrorResponse("Error. Missing required fields", 400);
            return;
        }

        // Check if the username already exists in the database
        $stmt = $this->dbConnection->db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->bind_param('s', $this->request['username']);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            sendErrorResponse("Error. Username already exists", 400);
            $stmt->close();
            return;
        }

        // Generate a unique salt
        $salt = bin2hex(random_bytes(16));

        // Hash the password with the salt
        $hashedPassword = hash('sha256', $this->request['password'] . $salt);

        // Generate an API key
        $apiKey = bin2hex(random_bytes(16));

        // Insert the new user into the database
        $stmt = $this->dbConnection->db->prepare("INSERT INTO users (username, password, salt, apikey) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('ssss', $this->request['username'], $hashedPassword, $salt, $apiKey);
        $success = $stmt->execute();
        $stmt->close();

        // Check if the user was successfully registered
        if ($success) {
            sendSuccessResponse(['apikey' => $apiKey]);
        } else {
            sendErrorResponse("Error. Failed to register user", 500);
        }
    }

    // Function to create a new auction
    private function createAuction() {
        // Validate input data
        if (!isset($this->request['auction_id']) || !isset($this->request['auction_name']) || !isset($this->request['auction_start_date']) || !isset($this->request['auction_end_date']) ||
            !isset($this->request['listing_title']) || !isset($this->request['listing_price']) || !isset($this->request['listing_location']) ||
            !isset($this->request['listing_bedrooms']) || !isset($this->request['listing_bathrooms']) || !isset($this->request['listing_parking_spaces']) ||
            !isset($this->request['listing_amenities']) || !isset($this->request['listing_description']) || !isset($this->request['listing_image']) ||
            !isset($this->request['highest_bid'])) {
            sendErrorResponse("Error. Missing required fields", 400);
            return;
        }

        // Extract data from the request
        $auctionId = $this->request['auction_id'];
        $auctionName = $this->request['auction_name'];
        $startDate = $this->request['auction_start_date'];
        $endDate = $this->request['auction_end_date'];
        $listingTitle = $this->request['listing_title'];
        $listingPrice = $this->request['listing_price'];
        $listingLocation = $this->request['listing_location'];
        $listingBedrooms = $this->request['listing_bedrooms'];
        $listingBathrooms = $this->request['listing_bathrooms'];
        $listingParkingSpaces = $this->request['listing_parking_spaces'];
        $listingAmenities = $this->request['listing_amenities'];
        $listingDescription = $this->request['listing_description'];
        $listingImage = $this->request['listing_image'];
        $highestBid = $this->request['highest_bid'];

        // Default state to 'Waiting' and buyer_id to null
        $auction_state = "Waiting";
        $buyerId = null;

        // Insert the new auction into the database
        $stmt = $this->dbConnection->db->prepare("INSERT INTO auctions (auction_id, auction_name, auction_start_date, auction_end_date, listing_title, listing_price, listing_location, listing_bedrooms, listing_bathrooms, listing_parking_spaces, listing_amenities, listing_description, listing_image, highest_bid, auction_state, buyer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('sssssdsiiisssdss', $auctionId, $auctionName, $startDate, $endDate, $listingTitle, $listingPrice, $listingLocation, $listingBedrooms, $listingBathrooms, $listingParkingSpaces, $listingAmenities, $listingDescription, $listingImage, $highestBid, $auction_state, $buyerId);
        $success = $stmt->execute();//sssssdsiiisssdss
        $stmt->close();

        // Check if the auction was successfully created
        if ($success) {
            sendSuccessResponse("Auction created successfully");
        } else {
            sendErrorResponse("Error. Failed to create auction", 500);
        }
    }


    // Function to update an existing auction
    private function updateAuction() {
        // Validate input data
        if (!isset($this->request['auction_id'])) {
            sendErrorResponse("Error. Missing required field: auction_id", 400);
            return;
        }

        // Extract data from the request
        $auctionId = $this->request['auction_id'];

        // Check if the auction exists
        $stmt = $this->dbConnection->db->prepare("SELECT * FROM auctions WHERE auction_id = ?");
        $stmt->bind_param('s', $auctionId);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();

        if ($result->num_rows === 0) {
            sendErrorResponse("Error. Auction not found", 404);
            return;
        }

        // Update the relevant fields in the database
        $updateQuery = "UPDATE auctions SET";
        $updateParams = [];
        $types = '';

        if (isset($this->request['auction_state'])) {
            $updateQuery .= " auction_state = ?,";
            $updateParams[] = $this->request['auction_state'];
            $types .= 's';
        }
        if (isset($this->request['highest_bid'])) {
            $updateQuery .= " highest_bid = ?,";
            $updateParams[] = $this->request['highest_bid'];
            $types .= 'd';
        }
        if (isset($this->request['buyer_id'])) {
            $updateQuery .= " buyer_id = ?,";
            $updateParams[] = $this->request['buyer_id'];
            $types .= 's';
        }

        // Remove trailing comma
        $updateQuery = rtrim($updateQuery, ',');

        // Add WHERE clause
        $updateQuery .= " WHERE auction_id = ?";
        $types .= 's';
        $updateParams[] = $auctionId;

        // Prepare and execute the update query
        $stmt = $this->dbConnection->db->prepare($updateQuery);
        $stmt->bind_param($types, ...$updateParams);
        $success = $stmt->execute();
        $stmt->close();

        // Check if the update was successful
        if ($success) {
            sendSuccessResponse("Auction updated successfully");
        } else {
            sendErrorResponse("Error. Failed to update auction", 500);
        }
    }


    // Function to retrieve auction details or names based on search criteria
    private function getAuction() {
        // Validate input data
        if (!isset($this->request['search'])) {
            sendErrorResponse("Error. Missing required field: search", 400);
            return;
        }

        // Extract search criteria
        $searchCriteria = $this->request['search'];

        // Build the SQL query based on the search criteria
        $query = "SELECT * FROM auctions";

        // Prepare WHERE clause based on search criteria
        $where = [];
        $types = '';
        $params = [];

        // Check if the search criteria is "*"
        if ($searchCriteria !== "*") {
            if (isset($searchCriteria['auction_name'])) {
                $where[] = "auction_name LIKE ?";
                $params[] = '%' . $searchCriteria['auction_name'] . '%';
                $types .= 's';
            }

            if (isset($searchCriteria['auction_state'])) {
                $where[] = "auction_state = ?";
                $params[] = $searchCriteria['auction_state'];
                $types .= 's';
            }

            if (isset($searchCriteria['auction_id'])) {
                $where[] = "auction_id = ?";
                $params[] = $searchCriteria['auction_id'];
                $types .= 's';
            }
        }

        if (!empty($where)) {
            $query .= " WHERE " . implode(" AND ", $where);
        }

        // Prepare and execute the query
        $stmt = $this->dbConnection->db->prepare($query);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();

        // Fetch the results
        $result = $stmt->get_result();
        $data = [];

        // Process each row
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }

        // Close the statement
        $stmt->close();

        // Return the data
        sendSuccessResponse($data);
    }



}

// Function to send success JSON response
function sendSuccessResponse($data) {
    header("HTTP/1.1 200 OK");
    header('Access-Control-Allow-Origin: *');
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status" => "success",
        "timestamp" => time(),
        "data" => $data
    ]);
}

// Function to send error JSON response
function sendErrorResponse($message, $statusCode = 400) {
    header("HTTP/1.1 $statusCode");
    header('Access-Control-Allow-Origin: *');
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status" => "error",
        "timestamp" => time(),
        "data" => $message
    ]);
    exit;
}

// Define the DatabaseConnection class
class DatabaseConnection {
    // Database connection settings
    private $servername = "wheatley.cs.up.ac.za";
    private $username = "u22644106";
    private $password = "BWZTH4HFXK3C7O6XYVMGVUVD3BAFAV5L";
    private $dbname = "u22644106_auction";
    public $db = null;

    // Singleton instance of the DatabaseConnection class
    public static function instance() {
        static $instance = null;
        if ($instance === null) {
            $instance = new DatabaseConnection();
        }
        return $instance;
    }

    // Constructor to establish the database connection
    private function __construct() {
        $this->db = new mysqli($this->servername, $this->username, $this->password, $this->dbname);
        if ($this->db->connect_error) {
            die("Connection failed: " . $this->db->connect_error);
        }
    }

    // Destructor to close the database connection
    public function __destruct() {
        $this->db->close();
    }

    // Validate API key
    public function validateApiKey($apiKey) {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE apikey = ?");
        $stmt->bind_param('s', $apiKey);
        $stmt->execute();
        $stmt->bind_result($count);
        $stmt->fetch();
        $stmt->close();

        return $count > 0;
    }
}