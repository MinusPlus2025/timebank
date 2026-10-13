// Generated from contracts/artifacts by scripts/export-abi.js. Do not edit.
export const timeBankAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "steward_",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BadLiveCode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "name": "BadSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "visitId",
        "type": "bytes32"
      }
    ],
    "name": "BadVisit",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CodeExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CodeFromFuture",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Expired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "name": "InsufficientHours",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMinutes",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "name": "NoGuardian",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotSteward",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SameMember",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "name": "UnknownMember",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "visitId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "visitor",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "tag",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "nonce",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "locationHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "community",
        "type": "bytes32"
      }
    ],
    "name": "Arrived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "community",
        "type": "bytes32"
      }
    ],
    "name": "Certified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "sealId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "guardian",
        "type": "bytes32"
      }
    ],
    "name": "ConfirmedByGuardian",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      }
    ],
    "name": "Donated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "from",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "to",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      }
    ],
    "name": "Gifted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "to",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      }
    ],
    "name": "Granted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "member",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "guardian",
        "type": "bytes32"
      }
    ],
    "name": "GuardianSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "challenge",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "community",
        "type": "bytes32"
      }
    ],
    "name": "PresenceVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "name": "Registered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "sealId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "helper",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "receiver",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "category",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "redeemed",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "seed",
        "type": "bytes32"
      }
    ],
    "name": "Sealed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "sealId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "codeBlock",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "includedBlock",
        "type": "uint256"
      }
    ],
    "name": "SealedInPerson",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "visitId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "sealId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "claimedMinutes",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "presentMinutes",
        "type": "uint32"
      }
    ],
    "name": "VisitClosed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "LIVE_WINDOW",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_MINUTES_PER_SEAL",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "NO_SEAL",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "member",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "guardian",
        "type": "bytes32"
      }
    ],
    "name": "appointGuardian",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "visitor",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tag",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "nonce",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "locationHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "challenge",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "sig",
        "type": "tuple"
      }
    ],
    "name": "arrive",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "visitId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "tag",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "nonce",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "locationHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "challenge",
        "type": "bytes32"
      }
    ],
    "name": "arriveDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "certifiedCommunity",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "community",
        "type": "bytes32"
      }
    ],
    "name": "certify",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "challenge",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "sig",
        "type": "tuple"
      }
    ],
    "name": "checkIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "guardian",
        "type": "bytes32"
      }
    ],
    "name": "dependentDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "from",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "sig",
        "type": "tuple"
      }
    ],
    "name": "donate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "from",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      }
    ],
    "name": "donateDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "from",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "to",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "sig",
        "type": "tuple"
      }
    ],
    "name": "gift",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "from",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "to",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      }
    ],
    "name": "giftDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "to",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      }
    ],
    "name": "grantFromPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "member",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "guardian",
        "type": "bytes32"
      }
    ],
    "name": "guardianDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "guardianOf",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "helper",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "receiver",
            "type": "bytes32"
          },
          {
            "internalType": "uint32",
            "name": "minutes_",
            "type": "uint32"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "redeem",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "visitId",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "deadline",
            "type": "uint64"
          }
        ],
        "internalType": "struct TimeBank.SealRequest",
        "name": "q",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "liveKey",
        "type": "address"
      }
    ],
    "name": "inPersonDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "inPersonMinutes",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "liveCodeBlock",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "digest",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "codeBlock",
        "type": "uint256"
      }
    ],
    "name": "liveCodeHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "x",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "y",
        "type": "bytes32"
      }
    ],
    "name": "memberId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "members",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "x",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "y",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "balance",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "nonce",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "openVisitOf",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolBalance",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "x",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "y",
        "type": "bytes32"
      }
    ],
    "name": "register",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "guardian",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "sig",
        "type": "tuple"
      }
    ],
    "name": "registerDependent",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "helper",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "receiver",
            "type": "bytes32"
          },
          {
            "internalType": "uint32",
            "name": "minutes_",
            "type": "uint32"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "redeem",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "visitId",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "deadline",
            "type": "uint64"
          }
        ],
        "internalType": "struct TimeBank.SealRequest",
        "name": "q",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "helperSig",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "receiverSig",
        "type": "tuple"
      }
    ],
    "name": "seal",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sealId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "helper",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "receiver",
            "type": "bytes32"
          },
          {
            "internalType": "uint32",
            "name": "minutes_",
            "type": "uint32"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "redeem",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "visitId",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "deadline",
            "type": "uint64"
          }
        ],
        "internalType": "struct TimeBank.SealRequest",
        "name": "q",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "helperSig",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "guardianSig",
        "type": "tuple"
      }
    ],
    "name": "sealByGuardian",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sealId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sealCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "helper",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "receiver",
            "type": "bytes32"
          },
          {
            "internalType": "uint32",
            "name": "minutes_",
            "type": "uint32"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "redeem",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "visitId",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "deadline",
            "type": "uint64"
          }
        ],
        "internalType": "struct TimeBank.SealRequest",
        "name": "q",
        "type": "tuple"
      }
    ],
    "name": "sealDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "helper",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "receiver",
            "type": "bytes32"
          },
          {
            "internalType": "uint32",
            "name": "minutes_",
            "type": "uint32"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "redeem",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "visitId",
            "type": "bytes32"
          },
          {
            "internalType": "uint64",
            "name": "deadline",
            "type": "uint64"
          }
        ],
        "internalType": "struct TimeBank.SealRequest",
        "name": "q",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "liveKey",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "codeBlock",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "liveSig",
        "type": "bytes"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "helperSig",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "receiverSig",
        "type": "tuple"
      }
    ],
    "name": "sealInPerson",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sealId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "seals",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "helper",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "receiver",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "minutes_",
        "type": "uint32"
      },
      {
        "internalType": "uint8",
        "name": "category",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "redeemed",
        "type": "bool"
      },
      {
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      },
      {
        "internalType": "bytes32",
        "name": "seed",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      }
    ],
    "name": "sealsOf",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "member",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "guardian",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "sig",
        "type": "tuple"
      }
    ],
    "name": "setGuardian",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "steward",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "id",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "challenge",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes",
            "name": "authenticatorData",
            "type": "bytes"
          },
          {
            "internalType": "string",
            "name": "clientDataSuffix",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "r",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "s",
            "type": "bytes32"
          }
        ],
        "internalType": "struct WebAuthnP256.Assertion",
        "name": "sig",
        "type": "tuple"
      }
    ],
    "name": "verifyPresence",
    "outputs": [
      {
        "internalType": "bool",
        "name": "ok",
        "type": "bool"
      },
      {
        "internalType": "bytes32",
        "name": "community",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "visitOfSeal",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "visits",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "visitor",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "start",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "closed",
        "type": "bool"
      },
      {
        "internalType": "bytes32",
        "name": "tag",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "nonce",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
