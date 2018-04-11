const PollManager = artifacts.require('./PollManager.sol');

module.exports = deployer => {
    deployer.deploy(PollManager, ["opt1", "opt2", "opt3", "opt4", "opt5"], 3600);
};
