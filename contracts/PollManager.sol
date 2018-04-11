pragma solidity 0.4.21;

contract PollManager {

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    modifier canVote {
        require(isOpen());
        _;
    }

    struct Elector {
        uint weight; // sum of elector delegates
        bool voted;
        address delegatedTo; // person delegated to
        uint vote;   // non zero if voted
    }

    struct Option {
        bytes32 name;
        uint voteCount;
    }

    address public owner;

    uint public endOfPoll;

    mapping(address => Elector) public electors;

    Option[] public options;

    // Constructor.
    function PollManager(bytes32[] optionsNames, uint pollTimeSeconds) public {
        owner = msg.sender;
        electors[owner].weight = 1;

        endOfPoll = now + pollTimeSeconds;

        for (uint i = 0; i < optionsNames.length; i++) {
            options.push(Option({
                name : optionsNames[i],
                voteCount : 0
            }));
        }
    }

    function allowToVote(address voter) public onlyOwner canVote {
        require(!electors[voter].voted);
        require(electors[voter].weight == 0);

        electors[voter].weight = 1;
    }

    // Delegate your vote to the representative voter `to`.
    function delegateTo(address to) public canVote {
        Elector storage sender = electors[msg.sender];
        require(!sender.voted);
        require(to != msg.sender);

        // Delegate to the top representative voter
        while (electors[to].delegatedTo != address(0)) {
            to = electors[to].delegatedTo;

            // Prevent loops.
            require(to != msg.sender);
        }

        sender.voted = true;
        sender.delegatedTo = to;

        Elector storage delegate_ = electors[to];
        if (delegate_.voted) {
            options[delegate_.vote].voteCount += sender.weight;
        } else {
            delegate_.weight += sender.weight;
        }
    }

    function vote(uint optionId) public canVote {
        Elector storage sender = electors[msg.sender];
        require(!sender.voted);
        require(sender.weight > 0);
        sender.voted = true;
        sender.vote = optionId;

        options[optionId].voteCount += sender.weight;
    }

    function getCurrentWinner() public view returns (uint currentWinner_) {
        uint winningVoteCount = 0;
        for (uint p = 0; p < options.length; p++) {
            if (options[p].voteCount > winningVoteCount) {
                winningVoteCount = options[p].voteCount;
                currentWinner_ = p;
            }
        }
    }

    function isOpen() public constant returns (bool) {
        return now < endOfPoll;
    }

    function getOptionName(uint optionId) public view returns (bytes32)
    {
        return options[optionId].name;
    }

    function winnerName() public view returns (bytes32)
    {
        return getOptionName(getCurrentWinner());
    }
}