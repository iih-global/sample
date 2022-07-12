import React from "react";

export default function SampleComponent(props) {
    
    return (
        <header className="App-header">
            <img src={`${process.env.PUBLIC_URL}/logo.png`} className="App-logo" alt="logo" />
            <p>
                IIH GLOBAL
            </p>
        </header>
    );
}
