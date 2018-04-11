const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const PollManager = artifacts.require('./PollManager.sol');

contract('PollManager', accounts => {
    const reverter = new Reverter(web3);
    afterEach('revert', reverter.revert);

    const asserts = Asserts(assert);
    const OWNER = accounts[0];
    let pollManagerContract;

    const electorsType = {
        weightIndex: 0,
        votedIndex: 1,
        delegatedToIndex: 2,
        voteIndex: 3
    };

    const optionsType = {
        nameIndex: 0,
        voteCountIndex: 1
    };

    before('setup', () => {
        return PollManager.deployed()
            .then(instance => pollManagerContract = instance)
            .then(reverter.snapshot);
    });

    it('should not let vote for not allowed', () => {
        const voter = accounts[3];
        const option = 1;
        return Promise.resolve()
            .then(() => asserts.throws(pollManagerContract.vote(option, {from: voter})));
    });

    it('should let to vote', async () => {
        const voter = accounts[5];
        const option = 4;

        await pollManagerContract.allowToVote(voter, {from: OWNER});
        await pollManagerContract.vote(option, {from: voter});
        let resultOption = await pollManagerContract.options(option);

        assert.equal(resultOption[optionsType.voteCountIndex].valueOf(), 1);
    });

    it('should not let double vote', () => {
        const voter = accounts[2];
        const option = 1;
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => pollManagerContract.vote(option, {from: voter}))
            .then(() => asserts.throws(pollManagerContract.vote(option, {from: voter})));
    });

    it('should let allow to vote', () => {
        const voter = accounts[3];
        const newVoter = accounts[5];
        const option = 2;
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => pollManagerContract.electors(voter))
            .then(elector => {
                assert.equal(elector[electorsType.weightIndex].valueOf(), 1);
                assert.isFalse(elector[electorsType.votedIndex]);
                assert.equal(elector[electorsType.voteIndex].valueOf(), 0);
            });
    });

    it('should let only owner allow to vote', () => {
        const voter = accounts[3];
        const newVoter = accounts[5];
        const option = 2;
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => asserts.throws(pollManagerContract.allowToVote(newVoter, {from: voter})));
    });

    it('should let allow to vote just once', () => {
        const voter = accounts[4];
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => asserts.throws(pollManagerContract.allowToVote(voter, {from: OWNER})));
    });

    it('should not allow to delegate to self', () => {
        const voter = accounts[2];
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => asserts.throws(pollManagerContract.delegateTo(voter, {from: voter})));
    });

    it('should not allow to delegate for already voted', () => {
        const voter = accounts[3];
        const delegate = accounts[2];
        const option = 3;
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => pollManagerContract.allowToVote(delegate, {from: OWNER}))
            .then(() => pollManagerContract.vote(option, {from: voter}))
            .then(() => asserts.throws(pollManagerContract.delegateTo(delegate, {from: voter})));
    });

    it('should not allow to vote even after delegate', () => {
        const voter = accounts[5];
        const delegate = accounts[4];
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => pollManagerContract.allowToVote(delegate, {from: OWNER}))
            .then(() => pollManagerContract.delegateTo(delegate, {from: voter}))
            .then(() => asserts.throws(pollManagerContract.allowToVote(voter, {from: OWNER})));
    });

    it('should let delegate', () => {
        const voter = accounts[4];
        const delegate = accounts[5];
        const option = 3;
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => pollManagerContract.allowToVote(delegate, {from: OWNER}))
            .then(() => pollManagerContract.delegateTo(delegate, {from: voter}))
            .then(() => pollManagerContract.electors(voter))
            .then(elector => {
                assert.equal(elector[electorsType.delegatedToIndex], delegate);
                assert.isTrue(elector[electorsType.votedIndex]);
            })
            .then(() => pollManagerContract.electors(delegate))
            .then(elector => {
                assert.equal(elector[electorsType.weightIndex].valueOf(), 2);
                assert.isFalse(elector[electorsType.votedIndex]);
                assert.equal(elector[electorsType.voteIndex].valueOf(), 0);
            })
            .then(() => pollManagerContract.vote(option, {from: delegate}))
            .then(() => pollManagerContract.options(option))
            .then(resultOption => {
                assert.equal(resultOption[optionsType.voteCountIndex].valueOf(), 2);
            });
    });

    it('should let delegate to already voted', () => {
        const voter = accounts[4];
        const delegate = accounts[5];
        const option = 4;
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => pollManagerContract.allowToVote(delegate, {from: OWNER}))
            .then(() => pollManagerContract.vote(option, {from: delegate}))
            .then(() => pollManagerContract.delegateTo(delegate, {from: voter}))
            .then(() => pollManagerContract.options(option))
            .then(resultOption => {
                assert.equal(resultOption[optionsType.voteCountIndex].valueOf(), 2);
            });
    });

    it('should prevent loop delegation', () => {
        const voter = accounts[4];
        const delegate1 = accounts[2];
        const delegate2 = accounts[3];
        return Promise.resolve()
            .then(() => pollManagerContract.allowToVote(voter, {from: OWNER}))
            .then(() => pollManagerContract.allowToVote(delegate1, {from: OWNER}))
            .then(() => pollManagerContract.allowToVote(delegate2, {from: OWNER}))
            .then(() => pollManagerContract.delegateTo(delegate1, {from: voter}))
            .then(() => pollManagerContract.delegateTo(delegate2, {from: delegate1}))
            .then(() => asserts.throws(pollManagerContract.delegateTo(voter, {from: delegate2})));
    });
});
