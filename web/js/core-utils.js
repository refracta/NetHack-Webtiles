class CoreUtils {
    static timeDelta2Simple(delta) {
        if (!delta) {
            return null;
        }
        delta = delta > 0 ? delta : 0;
        delta = Math.floor(delta / 1000);
        if (delta < 60) {
            return delta + 's';
        } else if (delta < 60 * 60) {
            return Math.floor(delta / 60) + 'm';
        } else if (delta < 24 * 60 * 60) {
            return Math.floor(delta / (60 * 60)) + 'h';
        } else if (delta < 365 * 24 * 60 * 60) {
            return Math.floor(delta / (24 * 60 * 60)) + 'd';
        } else {
            return Math.floor(delta / (365 * 24 * 60 * 60)) + 'y';
        }
    }

    static waitFor(vf, t) {
        return new Promise(r => {
            let i = setInterval(_ => {
                try {
                    let v = vf();
                    if (v) {
                        clearInterval(i);
                        r(v);
                    }
                } catch (e) {
                }
            }, t);
        });
    }
}

// export default CoreUtils;
