<?xml version="1.0" encoding="UTF-8"?>
<!--
    Module XSLT - Extraction de Relations
    Templates pour extraire les relations entre éléments IFC
-->

<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ifc="http://www.buildingsmart-tech.org/ifcXML/IFC4/final"
    xmlns:ifc2x3="http://www.iai-tech.org/ifcXML/IFC2x3/FINAL"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    exclude-result-prefixes="ifc ifc2x3 xlink">

    <xsl:import href="common.xsl"/>

    <!-- Template pour extraire toutes les relations -->
    <xsl:template name="ifc:extract-relationships">
        <xsl:param name="all-elements" as="element()*"/>
        
        <xsl:text>[</xsl:text>
        <xsl:variable name="count" as="xs:integer" select="0"/>
        <xsl:for-each select="$all-elements[local-name()='IfcRelContainedInSpatialStructure']">
            <xsl:if test="position() > 1 or $count > 0">,</xsl:if>
            <xsl:apply-templates select="." mode="ifc:relationship">
                <xsl:with-param name="type">CONTAINS</xsl:with-param>
            </xsl:apply-templates>
        </xsl:for-each>
        <xsl:for-each select="$all-elements[local-name()='IfcRelAggregates']">
            <xsl:if test="position() > 1 or count($all-elements[local-name()='IfcRelContainedInSpatialStructure']) > 0">,</xsl:if>
            <xsl:apply-templates select="." mode="ifc:relationship">
                <xsl:with-param name="type">AGGREGATES</xsl:with-param>
            </xsl:apply-templates>
        </xsl:for-each>
        <xsl:for-each select="$all-elements[local-name()='IfcRelVoidsElement']">
            <xsl:variable name="prev-count" select="count($all-elements[local-name()='IfcRelContainedInSpatialStructure']) + count($all-elements[local-name()='IfcRelAggregates'])"/>
            <xsl:if test="position() > 1 or $prev-count > 0">,</xsl:if>
            <xsl:apply-templates select="." mode="ifc:relationship">
                <xsl:with-param name="type">VOIDS</xsl:with-param>
            </xsl:apply-templates>
        </xsl:for-each>
        <xsl:for-each select="$all-elements[local-name()='IfcRelFillsElement']">
            <xsl:variable name="prev-count" select="count($all-elements[local-name()='IfcRelContainedInSpatialStructure']) + count($all-elements[local-name()='IfcRelAggregates']) + count($all-elements[local-name()='IfcRelVoidsElement'])"/>
            <xsl:if test="position() > 1 or $prev-count > 0">,</xsl:if>
            <xsl:apply-templates select="." mode="ifc:relationship">
                <xsl:with-param name="type">FILLS</xsl:with-param>
            </xsl:apply-templates>
        </xsl:for-each>
        <xsl:text>]</xsl:text>
    </xsl:template>

    <!-- Template pour une relation -->
    <xsl:template match="*" mode="ifc:relationship">
        <xsl:param name="type" as="xs:string"/>
        
        <xsl:text>{"type":"</xsl:text>
        <xsl:value-of select="$type"/>
        <xsl:text>"</xsl:text>
        <xsl:variable name="from-ref" select="ifc:extract-reference(.//*[local-name()='RelatingObject'])"/>
        <xsl:if test="$from-ref">
            <xsl:text>,"from_guid":"</xsl:text>
            <xsl:value-of select="$from-ref"/>
            <xsl:text>"</xsl:text>
        </xsl:if>
        <xsl:text>,"to_guids":[</xsl:text>
        <xsl:for-each select=".//*[local-name()='RelatedObjects']/*">
            <xsl:variable name="to-ref" select="ifc:extract-reference(.)"/>
            <xsl:if test="$to-ref">
                <xsl:if test="position() > 1">,</xsl:if>
                <xsl:text>"</xsl:text>
                <xsl:value-of select="$to-ref"/>
                <xsl:text>"</xsl:text>
            </xsl:if>
        </xsl:for-each>
        <xsl:text>]}</xsl:text>
    </xsl:template>

</xsl:stylesheet>

