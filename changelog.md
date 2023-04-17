
# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).
 
## [0.3.1] - 2023-04-17
 
- Improvements in frequency of block checking
- Improved config files with gas settings
- Improved logging
- Reduce Coingecko dependency as price oracle 
 
### Added
- [Issue #1](https://github.com/LOA-Labs/loa-node-toolkit/issues/2)
  Cache Coingecko prices per chain per every 6 hours
- [Issue #2](https://github.com/LOA-Labs/loa-node-toolkit/issues/2)
  New Block Event Subscriptions
- Add `appendRow` method to report class

### Changed
- signature of `getSignerObject` changed, handles mnemonic in function now
 
### Fixed
- fix report icon formatting 
- allow 0 fees for chains without fees specified, set in network config
 