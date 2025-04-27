const testData = {
    nodes: [{
        name : "a",
        username : "simon",
        position : [0, 0, 0]
    },{
        name : "b",
        username : "simon",
        position : [10, 0, 0]
    },{
        name : "c",
        username : "simon",
        position : [0, 10, 0]
    },{
        name : "d",
        username : "simon",
        position : [0, 0, 10]
    },{
        name : "e",
        username : "simon",
        position : [10, 10, 10]
    }],

    edges: [
        {
            edge_name : "relates",
            from_name : "a",
            to_name : "b",
            username : "simon",
            double_edge : false
        }, {
            edge_name : "relates",
            from_name : "b",
            to_name : "d",
            username : "simon",
            double_edge : false
        }, {
            edge_name : "relates",
            from_name : "c",
            to_name : "b",
            username : "simon",
            double_edge : false
        }, {
            edge_name : "relates",
            from_name : "d",
            to_name : "e",
            username : "simon",
            double_edge : true
        }, {
            edge_name : "relates",
            from_name : "c",
            to_name : "e",
            username : "simon",
            double_edge : false
        }
    ]
}

export default testData