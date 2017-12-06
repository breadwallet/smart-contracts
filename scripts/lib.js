function getTransactionStatus(web3, txhash) {
    return Promise.all([
        web3.eth.getTransaction(txhash),
        web3.eth.getTransactionReceipt(txhash)
    ]).then(function(results) {
        var tx = results[0];
        var receipt = results[1];
        if (tx.blockNumber && receipt.gasUsed < tx.gas) {
            return 'confirmed';
        }
        if (tx.blockNumber && receipt.gasUsed == tx.gas) {
            return 'failed';
        }
        if (!tx.blockNumber) {
            return 'pending';
        }
        return 'unknown';
    });
}

function waitFor(time) {
    return new Promise(function(resolve, reject) {
        setTimeout(resolve, time);
    });
}

function waitForConfirmation(web3, sendResult, iterations) {
    if (!iterations) {
        iterations = 1;
    }
    var maxIterations = 30;
    var pollTime = 5000;
    return getTransactionStatus(web3, sendResult.tx, iterations).then(function(status) {
        if (status == 'confirmed') {
            return true;
        } else if (status == 'pending' && iterations < maxIterations) {
            iterations += 1;
            console.log('waiting for', sendResult.tx, 'status', status, 'iterations', iterations);
            return waitFor(pollTime).then(function() {
                return waitForConfirmation(web3, sendResult, iterations);
            });
        } else {
            throw status;
        }
    });
}

module.exports.waitFor = waitFor;
module.exports.waitForConfirmation = waitForConfirmation;
module.exports.getTransactionStatus = getTransactionStatus;