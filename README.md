# Steam Card Farmer (Node.js) - compatible with Raspberry Pi Zero W and the ARMv6l architecture.

- Logs into Steam
- Scans your badges page
- Detects remaining card drops
- Idles games one at a time
- Automatically switches when finished

Works on low-power devices like a Raspberry Pi Zero W.

---

## Requirements

- Raspberry Pi or Linux machine (armv6l/armv7/x64)
- Node.js **v16+** (armv6l builds supported)
- npm
- A Steam account with:
  - Steam Guard enabled
  - Games with card drops remaining

You can check if you have drops by visiting:  
[https://steamcommunity.com/my/badges](https://steamcommunity.com/my/badges)



## Installation

Clone the repository:

```bash
git clone https://github.com/YOURNAME/steam-card-farmer.git
cd steam-card-farmer
```
Open farmer.js and replace "USERNAME HERE" with your Steam username and "PASSWORD HERE" with your Steam password.
```bash
# Install all required packages
npm install

# Run steam idler
npm start

# NOTE!! You will need to enter your Steam Guard code!
```

# Installing Node.js for armv6l
```bash
# Download precompiled Node v16 for armv6l
wget https://unofficial-builds.nodejs.org/download/release/v16.20.2/node-v16.20.2-linux-armv6l.tar.xz

# Extract the tarball
tar -xf node-v16.20.2-linux-armv6l.tar.xz

# Move Node to /opt/node
sudo mv node-v16.20.2-linux-armv6l /opt/node

# Add Node to PATH
echo 'export PATH=/opt/node/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify installation
node -v
npm -v
```
