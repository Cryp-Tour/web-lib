CrypTourWeb = {
    web3provider: null,
    contracts: {},
    listeners: { 
        onload: []
    },
    contractJSONPaths: ["/contracts/BPool.json"],
    state: {
        initWeb3: false,
        initContracts: 0
    },

    addOnLoadListener: function (callback) {
        onload.push(callback);
    },

    init: async function () {
        return CrypTourWeb.initWeb3();
    },

    initWeb3: function () {
        // Modern dapp browsers...
        if (window.ethereum) {
            CrypTourWeb.web3Provider = window.ethereum;
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            CrypTourWeb.web3Provider = window.web3.currentProvider;
        }
        // TODO: fallback for not compatible Browsers
        CrypTourWeb.state.initWeb3 = true;
        CrypTourWeb.initContract();
    },

    initContract: function () {
        CrypTourWeb.contractJSONPaths.forEach(path => {
            $.getJSON(path, function (data) {
                // Get the necessary contract artifact file and instantiate it with @truffle/contract
                let ContractArtifact = data;
                let name = ContractArtifact.contractName;

                CrypTourWeb.contracts[name] = TruffleContract(ContractArtifact);
        
                // Set the provider for our contract
                CrypTourWeb.contracts[name].setProvider(CrypTourWeb.web3Provider);

                // Call Listener for Onload 
                CrypTourWeb.state.initContracts++;
                if (CrypTourWeb.state.initContracts == CrypTourWeb.contractJSONPaths.length) {
                    CrypTourWeb.callListeners(CrypTourWeb.listeners.onload, undefined);
                }
            });
        })
    },

    callListeners: function (listeners, data) {
        listeners.forEach(listener => {
            listener(data);
        });
    }
}