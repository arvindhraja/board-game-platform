class CarromAI {
    constructor(difficulty = 1) {
        this.difficulty = difficulty; // 1-10
    }

    calculateShot(coins, striker) {
        let targets = coins.filter(c => c.active);
        if (targets.length === 0) return null;

        let bestShot = null;
        let minDifficulty = Infinity;

        const pockets = [[50, 50], [750, 50], [50, 750], [750, 750]];

        targets.forEach(coin => {
            pockets.forEach(pocket => {
                const cpDx = pocket[0] - coin.x;
                const cpDy = pocket[1] - coin.y;
                const cpDist = Math.hypot(cpDx, cpDy);
                const cpAngle = Math.atan2(cpDy, cpDx);

                const impactDist = 14 + 20;
                const impactX = coin.x - Math.cos(cpAngle) * impactDist;
                const impactY = coin.y - Math.sin(cpAngle) * impactDist;

                const strikerY = 140;

                let strikerX = impactX;
                if (strikerX < 100) strikerX = 100;
                if (strikerX > 700) strikerX = 700;

                const siDx = impactX - strikerX;
                const siDy = impactY - strikerY;
                const angle = Math.atan2(siDy, siDx);

                const dist = Math.hypot(siDx, siDy);
                const score = cpDist + dist;

                if (score < minDifficulty) {
                    minDifficulty = score;
                    bestShot = {
                        angle: angle,
                        power: Math.min((dist + cpDist) * 0.18, 50),
                        positionX: strikerX
                    };
                }
            });
        });

        if (bestShot) {
            bestShot.angle += (Math.random() - 0.5) * 0.05;
            return bestShot;
        }

        return {
            angle: Math.PI / 2,
            power: 20,
            positionX: 400
        };
    }
}

module.exports = CarromAI;
