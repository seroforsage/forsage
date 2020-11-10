pragma solidity 0.6.10;
// SPDX-License-Identifier: GPL-3.0 pragma solidity >=0.4.16 <0.7.0;
pragma experimental ABIEncoderV2;
import "strings.sol";

contract SeroInterface {

    bytes32 private topic_sero_send = 0x868bd6629e7c2e3d2ccf7b9968fad79b448e7a2bfb3ee20ed1acbc695c3c8b23;
    bytes32 private topic_sero_currency = 0x7c98e64bd943448b4e24ef8c2cdec7b8b1275970cfe10daf2a9bfa4b04dce905;

    function sero_msg_currency() internal returns (string memory) {
        bytes memory tmp = new bytes(32);
        bytes32 b32;
        assembly {
            log1(tmp, 0x20, sload(topic_sero_currency_slot))
            b32 := mload(tmp)
        }
        return strings._bytes32ToStr(b32);
    }

    function sero_send_token(address _receiver, string memory _currency, uint256 _amount) internal returns (bool success){
        return sero_send(_receiver, _currency, _amount, "", 0);
    }

    function sero_send(address _receiver, string memory _currency, uint256 _amount, string memory _category, bytes32 _ticket) internal returns (bool success){
        bytes memory temp = new bytes(160);
        assembly {
            mstore(temp, _receiver)
            mstore(add(temp, 0x20), _currency)
            mstore(add(temp, 0x40), _amount)
            mstore(add(temp, 0x60), _category)
            mstore(add(temp, 0x80), _ticket)
            log1(temp, 0xa0, sload(topic_sero_send_slot))
            success := mload(add(temp, 0x80))
        }
    }
}

contract SeroForsage is SeroInterface {
    uint256 constant private period = 3600;
    struct User {
        uint id;
        address referrer;
        uint partnersCount;
        uint x3Income;
        uint x6Income;

        mapping(uint8 => bool) activeX3Levels;
        mapping(uint8 => bool) activeX6Levels;

        mapping(uint8 => X3) x3Matrix;
        mapping(uint8 => X6) x6Matrix;
    }

    struct X3 {
        address currentReferrer;
        address[] referrals;
        uint8[] relationships;
        bool blocked;
        uint reinvestCount;
        uint partnersCount;
        bool isExtraDividends;
    }

    struct X6 {
        address currentReferrer;
        address[] firstLevelReferrals;
        uint8[] firstLevelRelationships;
        address[] secondLevelReferrals;
        uint8[] secondLevelRelationships;
        bool blocked;
        uint reinvestCount;
        uint partnersCount;
        bool isExtraDividends;

        address closedPart;
    }

    struct X3Info {
        uint currentReferrerId;
        uint[] referrals;
        uint8[] relationships;
        bool blocked;
        uint reinvestCount;
        uint partnersCount;
        bool isExtraDividends;
        bool active;
    }

    struct X6Info {
        uint currentReferrerId;
        uint[] firstLevelReferrals;
        uint8[] firstLevelRelationships;
        uint[] secondLevelReferrals;
        uint8[] secondLevelRelationships;
        bool blocked;
        uint reinvestCount;
        uint partnersCount;
        bool isExtraDividends;
        bool active;
    }


    uint8 private constant LAST_LEVEL = 12;

    mapping(address => User) private users;
    mapping(uint => address) private idToAddress;

    uint private lastUserId = 2;
    address private owner;

    mapping(uint => uint) public registrationTimes;
    uint totalAmount;

    mapping(uint8 => uint) private levelPrice;

    string private currency;


    constructor(string memory _currency, uint256 price) public {
        currency = _currency;
        levelPrice[1] = price;
        for (uint8 i = 2; i <= LAST_LEVEL; i++) {
            levelPrice[i] = levelPrice[i - 1] * 2;
        }

        owner = msg.sender;

        users[owner] = User({
            id : 1,
            referrer : address(0),
            partnersCount : uint(0),
            x3Income : 0,
            x6Income : 0
            });

        for (uint8 i = 1; i <= LAST_LEVEL; i++) {
            users[owner].activeX3Levels[i] = true;
            users[owner].activeX6Levels[i] = true;
        }
        idToAddress[1] = owner;
    }

    function registration(uint referId) external payable {
        require(strings._stringEq(currency, sero_msg_currency()));
        require(referId < lastUserId);
        totalAmount += msg.value;
        registration(msg.sender, idToAddress[referId]);
    }

    function buyNewLevel(uint8 matrix, uint8 level) external payable {
        require(strings._stringEq(currency, sero_msg_currency()));
        require(isUserExists(msg.sender), "user is not exists. Register first.");
        require(matrix == 1 || matrix == 2, "invalid matrix");
        require(msg.value == levelPrice[level], "invalid price");
        require(level > 1 && level <= LAST_LEVEL, "invalid level");

        totalAmount += msg.value;
        if (matrix == 1) {
            require(!users[msg.sender].activeX3Levels[level] &&
            users[msg.sender].activeX3Levels[level - 1], "level already activated");

            if (users[msg.sender].x3Matrix[level - 1].blocked) {
                users[msg.sender].x3Matrix[level - 1].blocked = false;
            }

            address freeX3Referrer = findFreeX3Referrer(msg.sender, level);
            users[msg.sender].x3Matrix[level].currentReferrer = freeX3Referrer;
            users[msg.sender].activeX3Levels[level] = true;
            updateX3Referrer(msg.sender, freeX3Referrer, level);


        } else {
            require(!users[msg.sender].activeX6Levels[level] &&
            users[msg.sender].activeX6Levels[level - 1], "level already activated");

            if (users[msg.sender].x6Matrix[level - 1].blocked) {
                users[msg.sender].x6Matrix[level - 1].blocked = false;
            }

            address freeX6Referrer = findFreeX6Referrer(msg.sender, level);

            users[msg.sender].activeX6Levels[level] = true;
            updateX6Referrer(msg.sender, freeX6Referrer, level);
        }
    }

    function registration(address userAddress, address referrerAddress) private {
        require(msg.value == levelPrice[1] * 2, "registration cost levelPrice[1] * 2");
        require(!isUserExists(userAddress), "user exists");
        require(isUserExists(referrerAddress), "referrer not exists");

        uint32 size;
        assembly {
            size := extcodesize(userAddress)
        }
        require(size == 0, "cannot be a contract");

        uint timeIndex = timeIndex();
        if (registrationTimes[timeIndex] == 0) {
            registrationTimes[timeIndex] = lastUserId;
        }

        users[userAddress] = User({
            id : lastUserId,
            referrer : referrerAddress,
            partnersCount : 0,
            x3Income : 0,
            x6Income : 0
            });

        idToAddress[lastUserId] = msg.sender;
        users[userAddress].activeX3Levels[1] = true;
        users[userAddress].activeX6Levels[1] = true;

        lastUserId++;

        users[referrerAddress].partnersCount++;

        address freeX3Referrer = findFreeX3Referrer(userAddress, 1);
        users[userAddress].x3Matrix[1].currentReferrer = freeX3Referrer;
        updateX3Referrer(userAddress, freeX3Referrer, 1);

        updateX6Referrer(userAddress, findFreeX6Referrer(userAddress, 1), 1);
    }

    function updateX3Referrer(address userAddress, address referrerAddress, uint8 level) private {
        users[referrerAddress].x3Matrix[level].referrals.push(userAddress);

        if (msg.sender == userAddress) {
            if(users[userAddress].referrer == referrerAddress) {
                users[referrerAddress].x3Matrix[level].relationships.push(0);
                users[referrerAddress].x3Matrix[level].partnersCount++;
            } else {
                users[referrerAddress].x3Matrix[level].relationships.push(3);
            }
        } else {
            if (users[userAddress].referrer == referrerAddress) {
                users[referrerAddress].x3Matrix[level].relationships.push(2);
            } else {
                users[referrerAddress].x3Matrix[level].relationships.push(3);
            }
        }

        if (users[referrerAddress].x3Matrix[level].referrals.length < 3) {
            return sendDividends(referrerAddress, 1, level);
        }

        //close matrix
        users[referrerAddress].x3Matrix[level].referrals = new address[](0);
        users[referrerAddress].x3Matrix[level].relationships = new uint8[](0);
        if (!users[referrerAddress].activeX3Levels[level + 1] && level != LAST_LEVEL) {
            users[referrerAddress].x3Matrix[level].blocked = true;
        }

        //create new one by recursion
        if (referrerAddress != owner) {
            //check referrer active level
            address freeReferrerAddress = findFreeX3Referrer(referrerAddress, level);
            if (users[referrerAddress].x3Matrix[level].currentReferrer != freeReferrerAddress) {
                users[referrerAddress].x3Matrix[level].currentReferrer = freeReferrerAddress;
            }

            users[referrerAddress].x3Matrix[level].reinvestCount++;
            updateX3Referrer(referrerAddress, freeReferrerAddress, level);
        } else {
            sendDividends(owner, 1, level);
            users[owner].x3Matrix[level].reinvestCount++;
        }
    }


    function updateX6Referrer(address userAddress, address referrerAddress, uint8 level) private {
        require(users[referrerAddress].activeX6Levels[level], "500. Referrer level is inactive");

        if (users[referrerAddress].x6Matrix[level].firstLevelReferrals.length < 2) {
            users[referrerAddress].x6Matrix[level].firstLevelReferrals.push(userAddress);
            if (msg.sender == userAddress) {
                if(users[userAddress].referrer == referrerAddress) {
                    users[referrerAddress].x6Matrix[level].firstLevelRelationships.push(0);
                    users[referrerAddress].x6Matrix[level].partnersCount++;
                } else {
                    users[referrerAddress].x6Matrix[level].firstLevelRelationships.push(3);
                }
            } else {
                if (users[userAddress].referrer == referrerAddress) {
                    users[referrerAddress].x6Matrix[level].firstLevelRelationships.push(2);
                } else {
                    users[referrerAddress].x6Matrix[level].firstLevelRelationships.push(3);
                }
            }

            //set current level
            users[userAddress].x6Matrix[level].currentReferrer = referrerAddress;

            if (referrerAddress == owner) {
                return sendDividends(referrerAddress, 2, level);
            }

            address ref = users[referrerAddress].x6Matrix[level].currentReferrer;

            users[ref].x6Matrix[level].secondLevelReferrals.push(userAddress);
            users[ref].x6Matrix[level].secondLevelRelationships.push(2);

            return updateX6ReferrerSecondLevel(ref, level);
        }

        users[referrerAddress].x6Matrix[level].secondLevelReferrals.push(userAddress);
        if (msg.sender == userAddress) {
            if(users[userAddress].referrer == referrerAddress) {
                users[referrerAddress].x6Matrix[level].secondLevelRelationships.push(0);
                users[referrerAddress].x6Matrix[level].partnersCount++;
            } else {
                users[referrerAddress].x6Matrix[level].secondLevelRelationships.push(3);
            }

        } else {
            if (users[userAddress].referrer == referrerAddress) {
                users[referrerAddress].x6Matrix[level].secondLevelRelationships.push(2);
            } else {
                users[referrerAddress].x6Matrix[level].secondLevelRelationships.push(3);
            }
        }

        if (users[referrerAddress].x6Matrix[level].closedPart != address(0)) {
            if ((users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] ==
            users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]) &&
                (users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x6Matrix[level].closedPart)) {

                updateX6(userAddress, referrerAddress, level, true);
                return updateX6ReferrerSecondLevel(referrerAddress, level);
            } else if (users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] ==
                users[referrerAddress].x6Matrix[level].closedPart) {
                updateX6(userAddress, referrerAddress, level, true);
                return updateX6ReferrerSecondLevel(referrerAddress, level);
            } else {
                updateX6(userAddress, referrerAddress, level, false);
                return updateX6ReferrerSecondLevel(referrerAddress, level);
            }
        }

        if (users[referrerAddress].x6Matrix[level].firstLevelReferrals[1] == userAddress) {
            updateX6(userAddress, referrerAddress, level, false);
            return updateX6ReferrerSecondLevel(referrerAddress, level);
        } else if (users[referrerAddress].x6Matrix[level].firstLevelReferrals[0] == userAddress) {
            updateX6(userAddress, referrerAddress, level, true);
            return updateX6ReferrerSecondLevel(referrerAddress, level);
        }

        if (users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[0]].x6Matrix[level].firstLevelReferrals.length <=
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]].x6Matrix[level].firstLevelReferrals.length) {
            updateX6(userAddress, referrerAddress, level, false);
        } else {
            updateX6(userAddress, referrerAddress, level, true);
        }

        updateX6ReferrerSecondLevel(referrerAddress, level);
    }

    function updateX6(address userAddress, address referrerAddress, uint8 level, bool x2) private {
        if (!x2) {
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[0]].x6Matrix[level].firstLevelReferrals.push(userAddress);
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[0]].x6Matrix[level].firstLevelRelationships.push(1);
            users[userAddress].x6Matrix[level].currentReferrer = users[referrerAddress].x6Matrix[level].firstLevelReferrals[0];
        } else {
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]].x6Matrix[level].firstLevelReferrals.push(userAddress);
            users[users[referrerAddress].x6Matrix[level].firstLevelReferrals[1]].x6Matrix[level].firstLevelRelationships.push(1);
            users[userAddress].x6Matrix[level].currentReferrer = users[referrerAddress].x6Matrix[level].firstLevelReferrals[1];
        }
    }

    function updateX6ReferrerSecondLevel(address referrerAddress, uint8 level) private {
        if (users[referrerAddress].x6Matrix[level].secondLevelReferrals.length < 4) {
            return sendDividends(referrerAddress, 2, level);
        }

        address[] memory x6 = users[users[referrerAddress].x6Matrix[level].currentReferrer].x6Matrix[level].firstLevelReferrals;

        if (x6.length == 2) {
            if (x6[0] == referrerAddress ||
            x6[1] == referrerAddress) {
                users[users[referrerAddress].x6Matrix[level].currentReferrer].x6Matrix[level].closedPart = referrerAddress;
            } else if (x6.length == 1) {
                if (x6[0] == referrerAddress) {
                    users[users[referrerAddress].x6Matrix[level].currentReferrer].x6Matrix[level].closedPart = referrerAddress;
                }
            }
        }

        users[referrerAddress].x6Matrix[level].firstLevelReferrals = new address[](0);
        users[referrerAddress].x6Matrix[level].secondLevelReferrals = new address[](0);
        users[referrerAddress].x6Matrix[level].firstLevelRelationships = new uint8[](0);
        users[referrerAddress].x6Matrix[level].secondLevelRelationships = new uint8[](0);
        users[referrerAddress].x6Matrix[level].closedPart = address(0);

        if (!users[referrerAddress].activeX6Levels[level + 1] && level != LAST_LEVEL) {
            users[referrerAddress].x6Matrix[level].blocked = true;
        }

        users[referrerAddress].x6Matrix[level].reinvestCount++;

        if (referrerAddress != owner) {
            address freeReferrerAddress = findFreeX6Referrer(referrerAddress, level);

            updateX6Referrer(referrerAddress, freeReferrerAddress, level);
        } else {
            sendDividends(owner, 2, level);
        }
    }

    function findFreeX3Referrer(address userAddress, uint8 level) private view returns (address) {
        while (true) {
            if (users[users[userAddress].referrer].activeX3Levels[level]) {
                return users[userAddress].referrer;
            }

            userAddress = users[userAddress].referrer;
        }
    }

    function findFreeX6Referrer(address userAddress, uint8 level) private view returns (address) {
        while (true) {
            if (users[users[userAddress].referrer].activeX6Levels[level]) {
                return users[userAddress].referrer;
            }

            userAddress = users[userAddress].referrer;
        }
    }

    function info() public view returns (uint256, uint256) {
        return (lastUserId, totalAmount);
    }

    function userInfo() public view returns (uint referId, uint id, uint partnersCount,uint x3Income, uint x6Income,
        X3Info[] memory x3Matrix, X6Info[] memory x6Matrix) {

        id =  users[msg.sender].id;
        referId = users[users[msg.sender].referrer].id;
        partnersCount = users[msg.sender].partnersCount;
        x3Income = users[msg.sender].x3Income;
        x6Income = users[msg.sender].x6Income;

        x3Matrix = new X3Info[](LAST_LEVEL);
        x6Matrix = new X6Info[](LAST_LEVEL);

        for(uint8 i=0;i<LAST_LEVEL;i++) {
            X3 memory x3 = users[msg.sender].x3Matrix[i+1];
            uint[] memory referrals = new uint[](x3.referrals.length);
            for(uint j=0;j<x3.referrals.length;j++){
                referrals[j] = users[x3.referrals[j]].id;
            }

            x3Matrix[i] = X3Info({
                currentReferrerId:users[x3.currentReferrer].id,
                referrals:referrals,
                relationships:x3.relationships,
                blocked:x3.blocked,
                reinvestCount:x3.reinvestCount,
                partnersCount:x3.partnersCount,
                isExtraDividends:x3.isExtraDividends,
                active:users[msg.sender].activeX3Levels[i+1]
                }) ;

            X6 memory x6 = users[msg.sender].x6Matrix[i+1];
            uint[] memory firstReferrals = new uint[](x6.firstLevelReferrals.length);

            for(uint j=0;j<x6.firstLevelReferrals.length;j++){
                firstReferrals[j] = users[x6.firstLevelReferrals[j]].id;
            }

            uint[] memory secondReferrals = new uint[](x6.secondLevelReferrals.length);
            for(uint j=0;j<x6.secondLevelReferrals.length;j++){
                secondReferrals[j] = users[x6.secondLevelReferrals[j]].id;
            }

            x6Matrix[i] = X6Info({currentReferrerId:users[x6.currentReferrer].id,
                firstLevelReferrals:firstReferrals,
                firstLevelRelationships:x6.firstLevelRelationships,
                secondLevelReferrals:secondReferrals,
                secondLevelRelationships:x6.secondLevelRelationships,
                blocked:x6.blocked,
                reinvestCount:x6.reinvestCount,
                partnersCount:x3.partnersCount,
                isExtraDividends:x6.isExtraDividends,
                active:users[msg.sender].activeX6Levels[i+1]
                });
        }
    }

    function isUserExists(address user) private view returns (bool) {
        return (users[user].id != 0);
    }

    function findReceiver(address userAddress, uint8 matrix, uint8 level) private view returns (address, bool) {
        address receiver = userAddress;
        bool isExtraDividends;
        if (matrix == 1) {
            while (true) {
                if (users[receiver].x3Matrix[level].blocked) {
                    isExtraDividends = true;
                    receiver = users[receiver].x3Matrix[level].currentReferrer;
                } else {
                    return (receiver, isExtraDividends);
                }
            }
        } else {
            while (true) {
                if (users[receiver].x6Matrix[level].blocked) {
                    isExtraDividends = true;
                    receiver = users[receiver].x6Matrix[level].currentReferrer;
                } else {
                    return (receiver, isExtraDividends);
                }
            }
        }
    }

    function sendDividends(address userAddress, uint8 matrix, uint8 level) private {
        (address receiver, bool isExtraDividends) = findReceiver(userAddress, matrix, level);

        uint value = levelPrice[level];
        if (matrix == 1) {
            users[receiver].x3Income += value;
        } else {
            users[receiver].x6Income += value;
        }

        require(sero_send_token(receiver, currency , value));

        if (isExtraDividends) {
            if (matrix == 1) {
                users[userAddress].x3Matrix[level].isExtraDividends = true;
            } else {
                users[userAddress].x6Matrix[level].isExtraDividends = true;
            }
        }
    }

    function timeIndex() private view returns (uint256) {
        return now - now % period;
    }
}



