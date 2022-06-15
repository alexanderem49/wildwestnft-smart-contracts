import download from "download";
import fs from "fs";

type NftImage = {
    id: number,
    size: number
};

async function main() {
    const sizes: NftImage[] = [];
    for (let i = 1; i <= 10005; i++) {
        const folder = `img`;
        const filePath = `${folder}\\${i}.webp`;
        const url = `https://upload-ww.mypinata.cloud/ipfs/QmUJKTnPnv3ENRhvw8TKYRU8NipGWAHDDJF9JTXpBokME8/${i}.webp`;

        try {
            await download(url, folder);
        } catch (error) {
            console.log("!!! Something is wrong with file", i);
            continue;
        }

        var stats = fs.statSync(filePath);
        var fileSizeInBytes = stats.size;

        sizes.push({
            id: i,
            size: fileSizeInBytes
        });
    }
    fs.writeFile('sizes.json', JSON.stringify(sizes, null, 4), function (err) {
        if (err) return console.log(err);
        console.log('Write done');
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
